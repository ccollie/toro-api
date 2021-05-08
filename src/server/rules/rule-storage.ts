import boom from '@hapi/boom';
import {
  isEmpty,
  isFunction,
  isNil,
  isNumber,
  isObject,
  isString,
} from 'lodash';
import { parseTimestamp } from '../lib/datetime';
import {
  checkMultiErrors,
  convertTsForStream,
  EventBus,
  parseMessageResponse,
} from '../redis';
import { getAlertsKey, getRuleKey, getRuleStateKey } from '../lib/keys';

import { Rule } from './rule';
import { Queue, RedisClient } from 'bullmq';
import {
  RuleAlert,
  RuleConfigOptions,
  RuleEventsEnum,
  RuleState,
  Severity,
} from '../../types';
import { Redis } from 'ioredis';
import { getUniqueId, parseBool, systemClock } from '../lib';
import {
  AlertData,
  PossibleTimestamp,
  RuleScripts,
  TimeSeries,
} from '../commands';

/* eslint @typescript-eslint/no-use-before-define: 0 */

export interface RuleAlertFilter {
  eventNames?: string[];
  ruleIds?: string[];
}

export interface RuleSortOpts {
  sortBy?: string;
  sortAscending?: boolean;
  fields?: string[];
}

/**
 * Manages the storage of {@link Rule} and {@link RuleAlert} instances related to a queue
 */
export class RuleStorage {
  private readonly queue: Queue;
  private readonly bus: EventBus;

  /**
   * Construct a {@link RuleManager}
   * @param {Queue} queue bull queue
   * @param {EventBus} bus queue bus
   */
  constructor(queue: Queue, bus: EventBus) {
    this.queue = queue;
    this.bus = bus;
  }

  destroy(): void {
    //
  }

  get rulesIndexKey(): string {
    return getRuleKey(this.queue);
  }

  private getAlertsKey(rule): string {
    return getAlertsKey(this.queue, getRuleId(rule));
  }

  async createRule(opts: RuleConfigOptions): Promise<Rule> {
    let isNew = false;
    let id = opts.id;
    if (!id) {
      isNew = true;
      id = opts.id = getUniqueId();
    }

    if (!opts.createdAt) {
      opts.createdAt = systemClock.getTime();
    }
    const key = this.getRuleKey(id);
    const client = await this.getClient();
    if (!isNew) {
      const existing = await client.exists(key);
      if (existing) {
        throw boom.badRequest(
          `A rule with id "${id}" exists in queue "${this.queue.name}"`,
        );
      }
    }
    const rule = new Rule(opts);
    return this.saveRule(rule);
  }

  getRuleKey(rule: Rule | string): string {
    return getRuleKey(this.queue, getRuleId(rule));
  }

  private getClient(): Promise<RedisClient> {
    return this.queue.client;
  }

  /*
   * Fetch a rule by id
   * @param {string} id
   * @returns {Promise<Rule>}
   */
  async getRule(id: string): Promise<Rule> {
    const client = await this.getClient();
    const data = await client.hgetall(this.getRuleKey(id));
    return deserializeRule(data);
  }

  /**
   * Update a rule
   * @param {Rule} rule
   * @returns {Promise<Rule>}
   */
  async saveRule(rule: Rule): Promise<Rule> {
    let existing = false;
    const isNew = !rule.id;
    const id = isNew ? getUniqueId() : rule.id;
    const key = this.getRuleKey(id);

    const client = await this.queue.client;

    if (!isNew) {
      existing = !!(await client.exists(key));
    }

    const event = existing
      ? RuleEventsEnum.RULE_UPDATED
      : RuleEventsEnum.RULE_ADDED;

    const data = serializeRule(rule) as Record<string, any>;
    if (existing) {
      delete data.id;
    }
    if (!data.createdAt) {
      data.createdAt = systemClock.getTime();
    }

    data.updatedAt = systemClock.getTime();
    const pipeline = client.pipeline();
    pipeline.hmset(key, data);
    pipeline.zadd(this.rulesIndexKey, rule.id, id);

    rule.updatedAt = data.updatedAt;

    await Promise.all([
      pipeline.exec().then(checkMultiErrors),
      this.bus.emit(event, {
        ruleId: id,
        data: rule.toJSON(),
      }),
    ]);

    return rule;
  }

  protected async _sort(opts: RuleSortOpts): Promise<Array<any>> {
    const ruleKeyPattern = getRuleKey(this.queue, '*');
    const args: string[] = [];
    const client = await this.getClient();
    if (opts.sortBy) {
      const sortSpec = `${ruleKeyPattern}->${opts.sortBy}`;
      args.push('alpha', 'by', sortSpec);
      args.push(!!opts.sortAscending ? 'asc' : 'desc');
    }
    let getHash = false;
    if (opts.fields && opts.fields.length) {
      opts.fields.forEach((name) => {
        args.push('GET', `*->${name}`);
      });
    } else {
      getHash = true;
      args.push('GET', '#');
    }
    const data = await client.sort(this.rulesIndexKey, ...args);
    if (isNumber(data)) return [];
    if (opts.fields && opts.fields.length) {
    }
    return data;
  }

  // utility function. Mainly to check for dupes while adding
  async getRuleNames(): Promise<Record<string, string>> {
    const client = await this.getClient();
    const result = Object.create(null);
    const response = await this._sort({ fields: ['id', 'name'] });
    return result;
  }

  /**
   * Update a rule
   * @param {Rule} rule
   * @returns {Promise<Rule>}
   */
  async partialUpdateRule(rule: Partial<Rule>): Promise<void> {
    const id = rule.id;
    if (!id) {
      throw boom.badRequest('Rule should have an id');
    }
    const key = this.getRuleKey(id);
    const client = await this.queue.client;

    const existing = await client.exists(key);
    if (!existing) {
      throw boom.notFound('No rule found with id: ' + id);
    }
    const data = serializeRule(rule) as Record<string, any>;
    delete data.id;

    data.updatedAt = systemClock.getTime();
    const pipeline = client.pipeline();
    pipeline.hmset(key, data);
    rule.updatedAt = data.updatedAt;

    await Promise.all([
      pipeline.exec(),
      this.bus.emit(RuleEventsEnum.RULE_UPDATED, {
        ruleId: id,
        data,
      }),
    ]);
  }

  /**
   * Change a {@link Rule}'s ACTIVE status
   * @param {Rule|string} rule
   * @param {Boolean} isActive
   * @return {Promise<Boolean>}
   */
  async setRuleStatus(
    rule: Rule | string,
    isActive: boolean,
  ): Promise<boolean> {
    const id = getRuleId(rule);
    const key = this.getRuleKey(id);
    const client = await this.getClient();

    const reply = client
      .pipeline()
      .exists(key)
      .hget(key, 'active')
      .hset(key, 'active', isActive ? 'true' : 'false')
      .exec()
      .then(checkMultiErrors);

    const exists = reply[0];
    const wasActive = parseBool(reply[1]);
    if (exists) {
      if (wasActive !== isActive) {
        const eventName = isActive
          ? RuleEventsEnum.RULE_ACTIVATED
          : RuleEventsEnum.RULE_DEACTIVATED;
        await this.bus.emit(eventName, {
          ruleId: id,
        });

        const now = systemClock.getTime();
        await client.hset(key, 'updatedAt', now);

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
    const ruleId = getRuleId(rule);
    const ruleKey = this.getRuleKey(ruleId);
    const alertsKey = this.getAlertsKey(rule);
    const stateKey = getRuleStateKey(this.queue, ruleId);
    const client = await this.getClient();
    const pipeline = client.pipeline();

    const responses = await TimeSeries.multi
      .size(pipeline, alertsKey)
      .del(ruleKey, alertsKey, stateKey)
      .zrem(this.rulesIndexKey, ruleId)
      .exec()
      .then(checkMultiErrors);

    const [hasAlerts, deleted] = responses;
    if (deleted) {
      const calls = [this.bus.emit(RuleEventsEnum.RULE_DELETED, { ruleId })];
      if (!!hasAlerts) {
        calls.push(
          this.bus.emit(RuleEventsEnum.RULE_ALERTS_CLEARED, { ruleId }),
        );
      }
      await Promise.all(calls);
    }
    return !!deleted;
  }

  /**
   * Return rules from storage
   * @param {String} sortBy {@link Rule} field to sort by
   * @param {Boolean} asc
   * @return {Promise<[Rule]>}
   */
  async getRules(sortBy = 'createdAt', asc = true): Promise<Rule[]> {
    const ruleKeyPattern = getRuleKey(this.queue, '*');
    const sortSpec = `${ruleKeyPattern}->${sortBy}`;
    const client = await this.getClient();
    const ids = await client.sort(
      this.rulesIndexKey,
      'alpha',
      'by',
      sortSpec,
      asc ? 'asc' : 'desc',
    );
    const pipeline = client.pipeline();
    (ids as string[]).forEach((id) => {
      const key = this.getRuleKey(id);
      pipeline.hgetall(key);
    });

    const result: Rule[] = [];
    const reply = await pipeline.exec().then(checkMultiErrors);
    reply.forEach((resp) => {
      if (resp) {
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
  // TODO: change
  /**
   * Write an alert to redis
   * @param {Rule|string} rule
   * @param {RuleAlert} data
   * @return {Promise<RuleAlert>}
   */
  async addAlert(rule: Rule | string, data: RuleAlert): Promise<RuleAlert> {
    const ruleId = getRuleId(rule);
    const alert = serializeAlert(data);
    alert.ruleId = ruleId;

    let severity: Severity = data.severity;

    if (!data.id) {
      alert.id = getUniqueId(); // set id to start
      if (typeof rule !== 'string') {
        severity = rule.severity;
      } else {
        const _rule = await this.getRule(ruleId);
        severity = _rule.severity;
      }
      alert.severity = data.severity = severity;
    }

    const alertData: AlertData = {
      errorLevel: data.errorLevel,
      id: getUniqueId(),
      value: data.value,
      state: data.state,
      message: data.message,
    };

    return RuleScripts.writeAlert(this.queue, rule, alertData);
  }

  /**
   * Get an alert by {@link Rule} and id
   * @param {Rule|string} rule
   * @param {string} id alert id
   * @return {Promise<RuleAlert>}
   */
  async getAlert(rule: Rule | string, id: string): Promise<RuleAlert> {
    const ruleId = getRuleId(rule);
    const key = this.getAlertsKey(rule);
    const client = await this.getClient();
    const data = await TimeSeries.get(client, key, id);
    if (data) data['ruleId'] = ruleId;
    return deserializeAlert(data);
  }

  async deleteAlert(rule: Rule | string, id: string): Promise<boolean> {
    const client = await this.getClient();
    const alertsKey = this.getAlertsKey(rule);
    const deleted = await TimeSeries.del(client, alertsKey, id);
    if (!!deleted) {
      const ruleId = getRuleId(rule);
      await this.bus.emit(RuleEventsEnum.ALERT_DELETED, {
        ruleId,
        id,
      });
    }
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
    start: PossibleTimestamp = '-',
    end: PossibleTimestamp = '+',
    asc = true,
  ): Promise<RuleAlert[]> {
    const client = await this.getClient();
    const key = this.getAlertsKey(rule);
    const method = asc ? TimeSeries.getRange : TimeSeries.getRevRange;
    const reply = await method(client, key, start, end);

    return reply.map(({ value }) => {
      return deserializeAlert(value);
    });
  }

  async getRuleAlertCount(rule: Rule | string): Promise<number> {
    const client = await this.getClient();
    const key = this.getAlertsKey(rule);
    return TimeSeries.size(client, key);
  }

  /**
   * Get alerts for the current {@link Queue}
   * @param {Date|number|string} start
   * @param {Date|number|string} end
   * @param {Boolean} [asc=true] sort ascending
   * @param {number} limit
   * @return {Promise<[RuleAlert]>}
   */
  async getAlerts(
    start: any = '-',
    end: any = '+',
    asc = true,
    limit?: number,
  ): Promise<RuleAlert[]> {
    function sortFn(first, second): number {
      const comp = first.start - second.start;
      if (comp === 0) {
        const a = first.ruleId;
        const b = second.ruleId;
        return a === b ? 0 : a > b ? 1 : -1;
      }
    }

    const client = await this.getClient();
    const ruleIds = await this.getRuleIds();

    const pipeline = client.pipeline();

    // get rules with alerts
    start = convertTsForStream(start);
    end = convertTsForStream(end);

    if (!asc) {
      // reverse for revrange
      const temp = start;
      start = end;
      end = temp;
    }

    const fn = asc ? TimeSeries.multi.getRange : TimeSeries.multi.getRevRange;
    ruleIds.forEach((ruleId) => {
      const key = this.getAlertsKey(ruleId);
      fn(pipeline, key, start, end, 0, limit);
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
    const [client, ruleIds] = await Promise.all([
      this.getClient(),
      this.getRuleIds(),
    ]);
    const pipeline = client.pipeline();
    ruleIds.forEach((ruleId) => {
      TimeSeries.multi.size(pipeline, this.getAlertsKey(ruleId));
    });
    const reply = await pipeline.exec().then(checkMultiErrors);

    return reply.reduce((count, resp) => count + resp, 0);
  }

  async clearAlerts(rule: Rule | string): Promise<number> {
    const count = this.getRuleAlertCount(rule);
    const client = await this.getClient();
    const key = this.getAlertsKey(rule);
    await client.del(key);
    await this.bus.emit(RuleEventsEnum.RULE_ALERTS_CLEARED, {
      ruleId: getRuleId(rule),
    });
    return isNumber(count) ? count : 0;
  }

  /**
   * Prune alerts according to a retention duration
   * @param {Rule|string} rule
   * @param {Number} retention in ms. Alerts before (getTime - retention) will be removed
   * @returns {Promise<Number>}
   */
  async pruneAlerts(rule: Rule | string, retention: number): Promise<number> {
    // TODO: raise event
    const client = await this.getClient();
    const alertsKey = this.getAlertsKey(rule);
    return TimeSeries.truncate(client, alertsKey, retention);
  }

  async getRuleIds(): Promise<string[]> {
    const client = await this.getClient();
    const elements = await client.zrange(
      this.rulesIndexKey,
      0,
      -1,
      'WITHSCORES',
    );
    const result: string[] = [];
    for (let i = 0; i < elements.length; i += 2) {
      result.push(elements[i + 1]);
    }
    return result;
  }
}

function getRuleId(rule: Rule | string): string {
  let ruleId;
  if (rule instanceof Rule) {
    ruleId = rule.id;
  } else {
    ruleId = rule;
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

function serializeRule(rule): Record<string, any> {
  const data = isFunction(rule.toJSON) ? rule.toJSON() : rule;

  // serialize object fields
  if (isObject(data.options)) {
    data.options = JSON.stringify(data.options);
  }

  if (isObject(data.payload)) {
    data.payload = JSON.stringify(data.payload);
  }

  if (isObject(data.metric)) {
    data.metric = JSON.stringify(data.metric);
  }

  if (isObject(data.condition)) {
    data.condition = JSON.stringify(data.condition);
  }

  data.channels = JSON.stringify(data.channels || []);

  return data;
}

function deserializeRule(data?: any): Rule {
  if (isEmpty(data)) return null;
  data.options = deserializeObject(data.options);
  data.payload = deserializeObject(data.payload);
  data.metric = deserializeObject(data.metric);
  data.condition = deserializeObject(data.condition);
  if (data.createdAt) {
    data.createdAt = parseInt(data.createdAt);
  }
  if (data.updatedAt) {
    data.updatedAt = parseInt(data.updatedAt);
  }
  // todo: debug this
  if (isString(data.lastTriggeredAt) && data.lastTriggeredAt.length) {
    data.lastTriggeredAt = parseInt(data.lastTriggeredAt);
  } else if (isNumber(data.lastTriggeredAt)) {
    data.lastTriggeredAt = parseInt(data.lastTriggeredAt);
  } else {
    delete data.lastTriggeredAt; //
  }
  data.isActive = parseBool(data.isActive, true);
  data.persist = parseBool(data.persist, true);
  data.state = (data.state ?? RuleState.NORMAL) as RuleState;
  if (typeof data.channels == 'string') {
    try {
      const channels = JSON.parse(data.channels);
      if (Array.isArray(channels)) {
        data.channels = channels;
      } else {
        data.channels = [];
      }
    } catch {
      data.channels = [];
    }
  } else {
    data.channels = [];
  }
  return new Rule(data);
}

function serializeAlert(data: RuleAlert): Record<string, any> {
  const { state, ...res } = data;
  res.failures = res.failures || 0;
  return res;
}

function deserializeAlert(data: any): RuleAlert {
  if (typeof data === 'string') {
    data = JSON.parse(data);
  }
  if (!isObject(data)) return null;

  const alertData: Record<string, any> = { ...data };
  alertData.raisedAt = parseTimestamp(data['raisedAt']);
  alertData.resetAt = parseTimestamp(data['resetAt']);
  alertData.state = deserializeObject(data['state']);
  alertData.failures = data['failures'] || 0;
  return alertData as RuleAlert;
}

function deserializeAlertReply(reply, ruleId: string): any {
  const recs = parseMessageResponse(reply);

  return recs.map(({ id, data }) => {
    if (data) data.ruleId = ruleId;
    const alert = deserializeAlert(data);
    return {
      ts: id,
      alert,
    };
  });
}
