import { Queue, RedisClient } from 'bullmq';
import { TimeSeries } from './timeseries';
import { ensureScriptsLoaded } from '../commands/utils';
import { getUniqueId } from '../lib';
import {
  getAlertsKey,
  getHostAlertCountKey,
  getHostKey,
  getQueueAlertCountKey,
  getQueueBusKey,
  getRuleKey,
  getRuleStateKey,
} from '../keys';
import { systemClock } from '../lib/clock';
import { has, isObject } from 'lodash';
import { Rule } from '../rules/rule';
import { RuleAlert } from '../rules/rule-alert';
import { ErrorStatus } from '../rules/types';
import { parseObjectResponse } from '../redis';
import { Pipeline } from 'ioredis';
import { HostManager } from '../hosts';
import { logger } from '../logger';
import { parseBool, parseTimestamp, safeParseInt } from '@alpen/shared';
import { encode as pack } from '../lib/msgpack';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export type RuleRunState = 'inactive' | 'active' | 'warmup';

export interface CheckAlertResult {
  status: RuleRunState;
  notify: boolean;
  state: CircuitState;
  triggered: boolean;
  errorStatus: ErrorStatus;
  endDelay?: number;
  alertId?: string;
  alertCount?: number;
  failures?: number;
  changed: boolean;
}

export interface AlertData {
  id: string;
  value: number;
  errorStatus: ErrorStatus;
  title?: string;
  message?: string;
  state: Record<string, any>;
}

export interface RuleAlertState {
  isActive: boolean;
  isStarted: boolean;
  errorStatus: ErrorStatus;
  circuitState: CircuitState;
  failures: number;
  totalFailures: number;
  successes: number;
  alertCount: number;
  alertId: string;
  lastFailure?: number;
  lastTriggeredAt?: number;
  lastNotify?: number;
  notifyPending?: boolean;
  isRead: boolean;
}

export interface MarkNotifyResult {
  notified: boolean;
  alertCount: number;
  remaining?: number;
  nextEarliest?: number;
}

function getRuleId(rule: Rule | string): string {
  if (typeof rule === 'string') return rule;
  return rule.id;
}

async function getClient(queue: Queue): Promise<RedisClient> {
  // horrible. fix this a the source
  const client = await ensureScriptsLoaded(await queue.client);
  return client;
}

type ParameterType = string | number | Record<string, any> | Buffer;

export class RuleScripts {
  private static getRuleActionArgs(
    queue: Queue,
    rule: Rule | string,
    action: string,
    parameter?: ParameterType,
    timestamp?: number,
  ): Array<string | number | Buffer> {
    timestamp = timestamp || systemClock.getTime();

    if (parameter === undefined) {
      parameter = '';
    } else if (typeof parameter !== 'string' && !Buffer.isBuffer(parameter)) {
      parameter = JSON.stringify(parameter);
    }

    const id = getRuleId(rule);
    return [
      getRuleKey(queue, id),
      getRuleStateKey(queue, id),
      getAlertsKey(queue, id),
      getQueueBusKey(queue),
      id,
      timestamp,
      action,
      parameter,
    ];
  }

  static async execRuleAction(
    queue: Queue,
    rule: Rule | string,
    action: string,
    parameter?: ParameterType,
    timestamp?: number,
  ): Promise<any> {
    const args = this.getRuleActionArgs(
      queue,
      rule,
      action,
      parameter,
      timestamp,
    );
    // horrible. fix this at the source
    const client = await getClient(queue);
    return (client as any).rules2(...args);
  }

  static pipelineRuleAction(
    pipeline: Pipeline,
    queue: Queue,
    rule: Rule | string,
    action: string,
    parameter?: ParameterType,
    timestamp?: number,
  ): Pipeline {
    const args = this.getRuleActionArgs(
      queue,
      rule,
      action,
      parameter,
      timestamp,
    );
    (pipeline as any).rules2(...args);
    return pipeline;
  }

  static async startRule(
    queue: Queue,
    rule: Rule | string,
    timestamp?: number,
  ): Promise<RuleRunState> {
    return RuleScripts.execRuleAction(
      queue,
      rule,
      'start',
      '',
      timestamp,
    );
  }

  static async stopRule(queue: Queue, rule: Rule | string): Promise<RuleRunState> {
    return RuleScripts.execRuleAction(queue, rule, 'stop');
  }

  static async checkAlert(
    queue: Queue,
    rule: Rule | string,
    alertData: AlertData,
    timestamp?: number,
  ): Promise<CheckAlertResult> {
    const response = await RuleScripts.execRuleAction(
      queue,
      rule,
      'check',
      pack(alertData),
      timestamp,
    );

    const res = parseObjectResponse(response);

    return {
      status: res['status'],
      errorStatus: res['errorStatus'] || ErrorStatus.NONE,
      alertCount: res['alerts'] ?? 0,
      failures: res['failures'] ?? 0,
      endDelay: res['endDelay'] ?? 0,
      alertId: res['alertId'] ?? '',
      state: (res['state'] ?? CircuitState.CLOSED) as CircuitState,
      triggered: ((res['state'] ?? CircuitState.CLOSED) as CircuitState) === CircuitState.OPEN,
      notify: parseBool(res['notify'], false),
      changed: parseBool(res['changed'], false),
    };
  }

  static async signalSuccess(
    queue: Queue,
    rule: Rule | string,
    alertData: AlertData,
    timestamp?: number,
  ): Promise<CheckAlertResult> {
    return RuleScripts.checkAlert(queue, rule, alertData, timestamp);
  }

  static async signalError(
    queue: Queue,
    rule: Rule | string,
    alertData: AlertData,
    timestamp?: number,
  ): Promise<CheckAlertResult> {
    return RuleScripts.checkAlert(queue, rule, alertData, timestamp);
  }

  static async getState(
    queue: Queue,
    rule: Rule | string,
    timestamp?: number,
  ): Promise<RuleAlertState> {
    const response = await RuleScripts.execRuleAction(
      queue,
      rule,
      'state',
      '',
      timestamp,
    );

    const res = parseObjectResponse(response);

    const result: RuleAlertState = res as RuleAlertState;
    result.isRead = parseBool(res['isRead'], true);
    result.isActive = parseBool(res['isActive'], true);
    result.isStarted = parseBool(res['isStarted'], false);
    result.notifyPending = has(res, 'notifyPending')
      ? parseBool(res.notifyPending)
      : undefined;
    // todo: this is verbose. We should get ints back properly from redis
    result.failures = safeParseInt(res.failures, 0);
    result.totalFailures = safeParseInt(res.totalFailures, 0);
    result.successes = safeParseInt(res.successes, 0);
    result.lastFailure = safeParseInt(res.lastFailure, 0);
    result.lastTriggeredAt = safeParseInt(res.lastTriggeredAt, 0);

    return result;
  }

  static async clearAlertState(
    queue: Queue,
    rule: Rule | string,
    timestamp?: number,
  ): Promise<number> {
    const val = await RuleScripts.execRuleAction(
      queue,
      rule,
      'clear',
      '',
      timestamp,
    );
    return parseInt(val);
  }

  static async writeAlert(
    host: string,
    queue: Queue,
    rule: Rule | string,
    data: AlertData,
    timestamp?: number,
  ): Promise<RuleAlert> {
    const client = await getClient(queue);
    const pipeline = client.pipeline();

    RuleScripts.pipelineRuleAction(
      pipeline,
      queue,
      rule,
      'alert',
      data,
      timestamp,
    );

    RuleScripts.pipelineAggregateAlertCounts(pipeline, host, queue);

    const res = await pipeline.exec();
    try {
      const [err, alert] = res[0];
      if (err) {
        logger.error(err);
        return null;
      }
      const temp = JSON.parse(alert);
      return temp as RuleAlert;
    } catch (e) {
      logger.error(e);
      return null;
    }
  }

  private static getUpdateQueueAlertCountArgs(
    queue: Queue,
  ): Array<string | number> {
    const ruleIndexKey = getRuleKey(queue);
    const countsKey = getQueueAlertCountKey(queue);

    return [ruleIndexKey, countsKey];
  }

  private static getUpdateHostAlertCountArgs(host: string): Array<string> {
    const queuesIndexKey = getHostKey(host, 'queues');
    const destinationKey = getHostKey(host, 'alertCount');
    const scratchKey = 'scratch-' + getUniqueId();
    return [queuesIndexKey, destinationKey, scratchKey];
  }

  static pipelineUpdateRuleAlertCount(
    pipeline: Pipeline,
    queue: Queue,
    rule: Rule | string,
  ): Pipeline {
    const ruleId = getRuleId(rule);
    const ruleKey = getRuleKey(queue, ruleId);
    const alertsKey = getAlertsKey(queue, ruleId);

    (pipeline as any).updateRuleAlertCount(ruleKey, alertsKey);
    return pipeline;
  }

  static pipelineAggregateAlertCounts(
    pipeline: Pipeline,
    host: string,
    queue: Queue,
  ): Pipeline {
    const queueUpdateArgs = RuleScripts.getUpdateQueueAlertCountArgs(queue);
    const hostUpdateArgs = RuleScripts.getUpdateHostAlertCountArgs(host);

    (pipeline as any).updateQueueAlertCount(...queueUpdateArgs);
    (pipeline as any).updateHostAlertCount(...hostUpdateArgs);
    return pipeline;
  }

  static async updateQueueAlertCount(queue: Queue): Promise<number> {
    const args = RuleScripts.getUpdateQueueAlertCountArgs(queue);
    const client = await getClient(queue);
    return (client as any).updateQueueAlertCount(...args);
  }

  static async getQueueAlertCount(queue: Queue): Promise<number> {
    const countsKey = getQueueAlertCountKey(queue);
    const client = await getClient(queue);
    const count = await client.get(countsKey);
    return parseInt(count ?? '0', 10);
  }

  static async getHostAlertCount(host: HostManager): Promise<number> {
    const key = getHostAlertCountKey(host.name);
    const count = await host.client.get(key);
    return parseInt(count ?? '0', 10);
  }

  static async markNotify(
    queue: Queue,
    rule: Rule | string,
    alertId: string,
    timestamp?: number,
  ): Promise<MarkNotifyResult> {
    const response = await RuleScripts.execRuleAction(
      queue,
      rule,
      'mark-notify',
      alertId,
      timestamp,
    );
    const res = parseObjectResponse(response);
    return {
      ...res,
      notified: parseBool(res['notified']),
      alertCount: res['alertCount'],
    };
  }

  /**
   * Get an alert by {@link Rule} and id
   * @param {Rule|string} rule
   * @param {string} id alert id
   * @return {Promise<RuleAlert>}
   */
  static async getAlert(queue: Queue, rule: Rule | string, id: string): Promise<RuleAlert> {
    const ruleId = getRuleId(rule);
    const key = getAlertsKey(queue, ruleId);
    const client = await getClient(queue);
    const data = await TimeSeries.get(client, key, id);
    if (data) data['ruleId'] = ruleId;
    return deserializeAlert(data);
  }

  static async markAlertAsRead(
    queue: Queue,
    rule: Rule | string,
    alertId: string,
    isRead: boolean,
  ): Promise<MarkNotifyResult> {
    const response = await RuleScripts.execRuleAction(
      queue,
      rule,
      isRead ? 'mark-read' : 'mark-unread',
      alertId,
    );
    const res = parseObjectResponse(response);
    return {
      ...res,
      notified: parseBool(res['notified']),
      alertCount: res['alertCount'],
    };
  }
}

export function deserializeAlert(data: any): RuleAlert {
  if (typeof data === 'string') {
    data = JSON.parse(data);
  }
  if (!isObject(data)) return null;

  const alertData: Record<string, any> = { ...data };
  alertData.raisedAt = parseTimestamp(data['raisedAt']);
  alertData.resetAt = parseTimestamp(data['resetAt']);
  alertData.state = deserializeObject(data['state']);
  alertData.payload = deserializeObject(data['payload']);
  alertData.failures = data['failures'] || 0;
  alertData.isRead = parseBool(data['isRead'], false);

  return alertData as RuleAlert;
}

function deserializeObject(val: any): any {
  const type = typeof val;
  const empty = Object.create(null);

  if (type === 'object') return val;

  if (['undefined', 'null'].includes(type)) {
    return empty;
  }

  try {
    return type === 'string' ? JSON.parse(val) : empty;
  } catch {
    // console.log
    return empty;
  }
}
