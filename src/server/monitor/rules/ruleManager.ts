import {
  isEmpty,
  isFunction,
  isNil,
  isNumber,
  isObject,
  isString,
} from 'lodash';

import boom from '@hapi/boom';
import nanoid from 'nanoid';

import { parseDuration, parseTimestamp } from '../../lib/datetime';
import { parseMessageResponse, toKeyValueList } from '../../redis/utils';
import { convertTsForStream, getStreamRange } from '../../redis/streams';
import { parseBool } from '../../lib/utils';
import { systemClock } from '../../lib/clock';
import { getAlertsKey, getQueueBusKey, getRuleKey } from '../keys';

import { Rule } from './rule';
import { QueueBus } from '../queues';
import { Queue } from 'bullmq';
import { RuleAlert, RuleConfigOptions } from 'rules';

/* eslint @typescript-eslint/no-use-before-define: 0 */

/**
 * Manages the storage of {@link Rule} and alert instances related to a queue
 */
export class RuleManager {
  private readonly queue: Queue;
  public readonly host: string;
  private readonly bus: QueueBus;

  /**
   * Construct a {@link RuleManager}
   * @param {string} host queue host
   * @param {Queue} queue bull queue
   * @param {QueueBus} bus queue bus
   */
  constructor(host: string, queue: Queue, bus: QueueBus) {
    this.host = host;
    this.queue = queue;
    this.bus = bus;
  }

  destroy(): void {
    // For consistency. Do not remove;
  }

  private get busKey(): string {
    return getQueueBusKey(this.queue);
  }

  get rulesIndexKey(): string {
    return getRuleKey(this.queue);
  }

  private getAlertsKey(rule): string {
    return getAlertsKey(this.queue, getRuleId(rule));
  }

  async addRule(rule: RuleConfigOptions): Promise<Rule> {
    if (!isObject(rule)) {
      throw boom.badRequest('addRile: Rule must be an object');
    }
    let id = rule.id;
    if (!id) {
      id = rule.id = nanoid(6);
    }

    if (!rule.createdAt) {
      rule.createdAt = systemClock.now();
    }
    const client = await this.queue.client;
    const result = new Rule(rule);
    const key = getRuleKey(this.queue, id);
    const existing = await client.exists(key);
    if (existing) {
      throw boom.badRequest(
        `A rule with id "${id}" exists in queue "${this.queue.name}"`,
      );
    }
    const data = serializeRule(rule);
    const pipeline = client.pipeline();
    pipeline.hmset(key, data);

    // add to index
    const indexKey = this.rulesIndexKey;
    pipeline.zadd(indexKey, `${rule.createdAt}`, id);
    this.bus.pipelineEmit(pipeline, 'rule.added', {
      rid: id,
      data: result.toJSON(),
    });

    await pipeline.exec();

    return result;
  }

  /*
   * Fetch a rule by id
   * @param {string} id
   * @returns {Promise<Rule>}
   */
  async getRule(id: string): Promise<Rule> {
    const key = getRuleKey(this.queue, id);
    const client = await this.queue.client;
    const data = await client.hgetall(key);
    return deserializeRule(data);
  }

  /**
   * Update a rule
   * @param {Rule} rule
   * @returns {Promise<Rule>}
   */
  async updateRule(rule): Promise<Rule> {
    const id = rule.id;
    if (!id) {
      throw boom.badRequest('Rule should have an id');
    }
    const key = getRuleKey(this.queue, id);
    const client = await this.queue.client;

    const existing = await client.exists(key);
    if (!existing) {
      return this.addRule(rule);
    }
    const data = serializeRule(rule) as Record<string, any>;
    delete data.id;

    data.updatedAt = systemClock.now();
    const pipeline = client.pipeline();
    pipeline.hmset(key, data);
    rule.updatedAt = data.updatedAt;
    this.bus.pipelineEmit(pipeline, 'rule.updated', {
      rid: id,
      data: rule.toJSON(),
    });

    await pipeline.exec();
    return rule;
  }

  /**
   * Change a {@link Rule}'s active status
   * @param {Rule|string} rule
   * @param {Boolean} isActive
   * @return {Promise<Boolean>}
   */
  async setRuleStatus(
    rule: Rule | string,
    isActive: boolean,
  ): Promise<boolean> {
    const id = getRuleId(rule);
    const key = getRuleKey(this.queue, id);
    const client = await this.queue.client;

    const pipeline = client.pipeline();
    pipeline.exists(key);
    pipeline.hget(key, 'active');
    pipeline.hset(key, 'active', isActive ? 'true' : 'false');

    const reply = await pipeline.exec();
    const exists = reply[0][1];
    const wasActive = parseBool(reply[1][1]);
    if (exists) {
      if (wasActive !== isActive) {
        const eventName = 'rule.' + (isActive ? 'activated' : 'deactivated');
        await this._busEmit(eventName, {
          rid: id,
        });

        return true;
      }
    } else {
      // oops. remove the hash
      await client.del(key);
      throw boom.notFound(`Rule "${id}" not found`);
    }

    return false;
  }

  async deleteRule(rule: Rule | string): Promise<boolean> {
    const response = await this._callLuaRuleMethod(rule, 'rule.delete');
    return !!response;
  }

  /**
   * Return rules from storage
   * @param {String} sortBy {@link Rule} field to sort by
   * @param {Boolean} asc
   * @return {Promise<[Rule]>}
   */
  async getRules(sortBy = 'createdAt', asc = true): Promise<Rule[]> {
    const indexKey = this.rulesIndexKey;
    const ruleKeyPattern = getRuleKey(this.queue, '*');
    const sortSpec = `${ruleKeyPattern}->${sortBy}`;
    const client = await this.queue.client;
    const ids = await client.sort(
      indexKey,
      'alpha',
      'by',
      sortSpec,
      asc ? 'asc' : 'desc',
    );
    const pipeline = client.pipeline();
    (ids as string[]).forEach((id) => {
      const key = getRuleKey(this.queue, id);
      pipeline.hgetall(key);
    });

    const result: Rule[] = [];
    const reply = await pipeline.exec();
    reply.forEach(([err, resp]) => {
      if (err) {
        console.log(err);
      } else if (resp) {
        try {
          const rule = deserializeRule(resp);
          if (rule) {
            result.push(rule);
          }
        } catch (err) {
          console.log(err);
        }
      }
    });

    return result;
  }

  // Alerts

  /**
   * Write an alert to redis
   * @param {Rule|string} rule
   * @param {String} eventName,
   * @param {RuleAlert} data
   * @return {Promise<RuleAlert>}
   */
  async addAlert(
    rule: Rule | string,
    eventName: string,
    data: Partial<RuleAlert>,
  ): Promise<RuleAlert> {
    data.start = data.start || systemClock.now();
    const ruleId = getRuleId(rule);
    const alert = serializeAlert(data);
    data.event = eventName;
    const id = await this._callLuaRuleMethod(
      ruleId,
      'alerts.add',
      eventName,
      ...toKeyValueList(alert),
    );
    if (id !== null) {
      return {
        id,
        ruleId,
        event: data.event,
        start: data.start,
        end: data.end,
        ...data,
      };
    }
    return null;
  }

  /**
   * Get an alert by {@link Rule} and id
   * @param {Rule|string} rule
   * @param {string} id alert id
   * @return {Promise<RuleAlert>}
   */
  async getAlert(rule: Rule | string, id: string): Promise<RuleAlert> {
    const ruleId = getRuleId(rule);
    let data = await this._callLuaRuleMethod(rule, 'alerts.get', id);
    if (data !== null) {
      data = luaTableToHash(data);
      const result = deserializeAlert(data);
      result.ruleId = ruleId;
      return result;
    }
    return null;
  }

  async deleteAlert(rule: Rule | string, id: string): Promise<boolean> {
    const deleted = await this._callLuaRuleMethod(rule, 'alerts.delete', id);
    return !!deleted;
  }

  /**
   * Get alerts for a given {@link Rule}
   * @param {Rule|string} rule
   * @param {Date|number|string} start
   * @param {Date|number|string} end
   * @param {Boolean} [asc=true] sort ascending
   * @return {Promise<[RuleAlert]>}
   */
  async getRuleAlerts(
    rule: Rule | string,
    start = 0,
    end = '$',
    asc = true,
  ): Promise<RuleAlert[]> {
    const key = this.getAlertsKey(rule);
    const client = await this.queue.client;
    const items = await getStreamRange(client, key, start, end, asc);
    return items.map((item) => deserializeAlert(item.data));
  }

  async getRuleAlertCount(rule: Rule | string): Promise<number> {
    const key = this.getAlertsKey(rule);
    const client = await this.queue.client;
    return client.xlen(key);
  }

  /**
   * Get alerts for the current {@link Queue}
   * @param {Date|number|string} start
   * @param {Date|number|string} end
   * @param {Boolean} [asc=true] sort ascending
   * @param {number} limit
   * @return {Promise<[RuleAlert]>}
   */
  async getAlerts(start, end, asc = true, limit): Promise<RuleAlert[]> {
    function sortFn(first, second): number {
      const comp = first.ts - second.ts;
      if (comp === 0) {
        const a = first.ruleId;
        const b = second.ruleId;
        return a === b ? 0 : a > b ? 1 : -1;
      }
    }

    const client = await this.queue.client;

    const ruleIds = await this.getRuleIds();

    const pipeline = client.pipeline();

    // get rules with alerts
    start = convertTsForStream(start);
    end = convertTsForStream(end);

    ruleIds.forEach((ruleId) => {
      const key = this.getAlertsKey(ruleId);
      pipeline.xrange(key, start, end);
    });

    const reply = await pipeline.exec();
    let result = [];
    let i = 0;

    reply.forEach(([err, resp]) => {
      if (!err) {
        result.push(...deserializeAlertReply(resp, ruleIds[i]));
      }
      i++;
    });

    result.sort((first, second) => {
      const comp = sortFn(first, second);
      return asc ? comp : -1 * comp;
    });

    if (isNumber(limit)) {
      result = result.slice(0, limit - 1);
    }

    return result;
  }

  async getQueueAlertCount(): Promise<number> {
    const ruleIds = await this.getRuleIds();
    const client = await this.queue.client;
    const pipeline = client.pipeline();
    ruleIds.forEach((ruleId) => {
      pipeline.xlen(this.getAlertsKey(ruleId));
    });
    const reply = await pipeline.exec();

    let count = 0;
    reply.forEach(([err, resp]) => {
      if (err) {
        console.log(err);
      } else {
        count = count + resp;
      }
    });

    return count;
  }

  async clearAlerts(rule: Rule | string): Promise<number> {
    const res = this._callLuaRuleMethod(rule, 'alerts.clear');
    return isNumber(res) ? res : 0;
  }

  /**
   * Prune alerts according to a retention duration
   * @param {Rule|string} rule
   * @param {String|Number} retention in ms. Alerts before (now - retention) will be removed
   * @returns {Promise<Number>}
   */
  async pruneAlerts(rule, retention): Promise<number> {
    retention = parseDuration(retention);
    return this._callLuaRuleMethod(rule, 'alerts.prune', retention);
  }

  private async getRuleIds(): Promise<string[]> {
    const client = await this.queue.client;
    const key = this.rulesIndexKey;
    const elements = await client.zrange(
      key,
      0,
      Number.MAX_VALUE,
      'WITHSCORES',
    );
    const result: string[] = [];
    for (let i = 0; i < elements.length; i += 2) {
      result.push(elements[i + 1]);
    }
    return result;
  }

  /**
   * Internal method to call lua rules library.
   * @private
   */
  private async _callLuaRuleMethod(
    rule,
    method: string,
    ...args
  ): Promise<any> {
    const id = getRuleId(rule);
    const ruleKey = getRuleKey(this.queue, id);
    const alertsKey = this.getAlertsKey(id);
    const client = await this.queue.client;
    return (client as any).rules(
      ruleKey,
      this.rulesIndexKey,
      alertsKey,
      this.busKey,
      id,
      method,
      ...args,
    );
  }

  /**
   * @param event
   * @param data
   * @private
   */
  private _busEmit(event: string, data = {}): Promise<void> {
    const eventData = {
      h: this.host,
      q: this.queue.name,
      ...data,
    };
    return this.bus.emit(event, eventData);
  }
}

function getRuleId(rule): string {
  let ruleId = rule;
  if (rule instanceof Rule) {
    ruleId = rule.id;
  }
  if (!ruleId) {
    throw boom.badRequest('Expected a rule');
  }
  return ruleId;
}

function serializeObject(obj): string {
  const payload = isObject(obj) ? obj : Object.create(null);
  return JSON.stringify(payload);
}

function deserializeObject(str: string): any {
  const empty = Object.create(null);
  if (isNil(str)) return empty;
  try {
    return isString(str) ? JSON.parse(str) : empty;
  } catch {
    // console.log
    return empty;
  }
}

function serializeRule(rule): object {
  const data = isFunction(rule.toJSON) ? rule.toJSON() : rule;

  // deserialize object fields
  if (isObject(data.options)) {
    data.options = JSON.stringify(data.options);
  }

  if (isObject(data.payload)) {
    data.payload = JSON.stringify(data.payload);
  }

  if (isObject(data.condition)) {
    data.condition = JSON.stringify(data.condition);
  }

  return data;
}

function deserializeRule(data?: any): Rule {
  if (isEmpty(data)) return null;
  data.options = deserializeObject(data.options);
  data.payload = deserializeObject(data.payload);
  data.condition = deserializeObject(data.condition);
  if (data.createdAt) {
    data.createdAt = parseInt(data.createdAt);
  }
  if (data.updatedAt) {
    data.updatedAt = parseInt(data.updatedAt);
  }
  data.active = parseBool(data.active);
  data.persist = parseBool(data.persist);
  if (isNil(data.notifiers) || data.notifiers.length === 0) {
    data.notifiers = [];
  }
  return new Rule(data);
}

function serializeAlert(data): object {
  return {
    event: data.event,
    start: data.start,
    end: data.end,
    state: serializeObject(data.state),
    payload: serializeObject(data.payload),
  };
}

function deserializeAlert(data: any): RuleAlert {
  if (!isObject(data)) return null;

  return {
    id: data['id'],
    event: data['event'],
    start: parseTimestamp(data['start']),
    end: parseTimestamp(data['end']),
    state: deserializeObject(data['state']),
    payload: deserializeObject(data['payload']),
  };
}

function deserializeAlertReply(reply, ruleId: string): any {
  const recs = parseMessageResponse(reply);

  return recs.map(({ id, data }) => {
    const alert = deserializeAlert(data);
    if (ruleId) alert.ruleId = ruleId;
    return {
      ts: id,
      alert,
    };
  });
}

function luaTableToHash(table): object {
  const res = Object.create(null);
  for (let i = 0; i < table.length; i += 2) {
    res[table[i]] = table[i + 1];
  }
  return res;
}
