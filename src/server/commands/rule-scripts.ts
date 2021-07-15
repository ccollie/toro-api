import { Queue } from 'bullmq';
import { ErrorLevel, RuleAlert, RuleState } from '../../types';
import {
  getAlertsKey,
  getHostAlertCountKey,
  getHostKey,
  getQueueAlertCountKey,
  getQueueBusKey,
  getRuleKey,
  getRuleStateKey,
  getUniqueId,
  logger,
  parseBool,
  safeParseInt,
  systemClock,
} from '../lib';
import { has } from 'lodash';
import { Rule } from '../rules';
import { parseObjectResponse } from '../redis';
import { Pipeline } from 'ioredis';
import { HostManager } from '@server/hosts';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CheckAlertResult {
  status: 'inactive' | 'warmup' | 'not_found' | 'ok';
  notify: boolean;
  state: CircuitState;
  endDelay?: number;
  alertId?: string;
  alertCount?: number;
  failures?: number;
}

export interface AlertData {
  id: string;
  value: number;
  errorLevel: ErrorLevel;
  title?: string;
  message?: string;
  state: Record<string, any>;
}

export interface RuleAlertState {
  isActive: boolean;
  state: CircuitState;
  ruleState: RuleState;
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

export class RuleScripts {
  private static getRuleActionArgs(
    queue: Queue,
    rule: Rule | string,
    action: string,
    parameter?: string | number | Record<string, any>,
    timestamp?: number,
  ): Array<string | number> {
    timestamp = timestamp || systemClock.getTime();

    if (parameter === undefined) {
      parameter = '';
    } else if (typeof parameter !== 'string') {
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
    parameter?: string | number | Record<string, any>,
    timestamp?: number,
  ): Promise<any> {
    const args = this.getRuleActionArgs(
      queue,
      rule,
      action,
      parameter,
      timestamp,
    );

    const client = await queue.client;
    return (client as any).rules(...args);
  }

  static pipelineRuleAction(
    pipeline: Pipeline,
    queue: Queue,
    rule: Rule | string,
    action: string,
    parameter?: string | number | Record<string, any>,
    timestamp?: number,
  ): Pipeline {
    const args = this.getRuleActionArgs(
      queue,
      rule,
      action,
      parameter,
      timestamp,
    );
    (pipeline as any).rules(...args);
    return pipeline;
  }

  static async startRule(
    queue: Queue,
    rule: Rule | string,
    timestamp?: number,
  ): Promise<boolean> {
    const val = await RuleScripts.execRuleAction(
      queue,
      rule,
      'start',
      '',
      timestamp,
    );
    return val === '1';
  }

  static async stopRule(queue: Queue, rule: Rule | string): Promise<boolean> {
    const val = await RuleScripts.execRuleAction(queue, rule, 'stop');
    return val === '1';
  }

  static async checkAlert(
    queue: Queue,
    rule: Rule | string,
    evalResult: ErrorLevel,
    timestamp?: number,
  ): Promise<CheckAlertResult> {
    const response = await RuleScripts.execRuleAction(
      queue,
      rule,
      'check',
      evalResult,
      timestamp,
    );

    const res = parseObjectResponse(response);

    return {
      status: res['status'],
      alertCount: res['alerts'] ?? 0,
      failures: res['failures'] ?? 0,
      endDelay: res['endDelay'] ?? 0,
      state: (res['state'] ?? CircuitState.CLOSED) as CircuitState,
      notify: parseBool(res['notify'], false),
    };
  }

  static async signalSuccess(
    queue: Queue,
    rule: Rule | string,
    timestamp?: number,
  ): Promise<CheckAlertResult> {
    return RuleScripts.checkAlert(queue, rule, ErrorLevel.NONE, timestamp);
  }

  static async signalError(
    queue: Queue,
    rule: Rule | string,
    timestamp?: number,
  ): Promise<CheckAlertResult> {
    return RuleScripts.checkAlert(queue, rule, ErrorLevel.CRITICAL, timestamp);
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
    const client = await queue.client;
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
    const client = await queue.client;
    return (client as any).updateQueueAlertCount(...args);
  }

  static async getQueueAlertCount(queue: Queue): Promise<number> {
    const countsKey = getQueueAlertCountKey(queue);
    const client = await queue.client;
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
