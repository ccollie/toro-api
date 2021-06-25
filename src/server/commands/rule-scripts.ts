import { Queue } from 'bullmq';
import { ErrorLevel, RuleAlert, RuleState } from '../../types';
import {
  getAlertsKey,
  getQueueAlertCountKey,
  getQueueBusKey,
  getRuleKey,
  getRuleStateKey,
  parseBool,
  safeParseInt,
  systemClock,
} from '../lib';
import { has } from 'lodash';
import { Rule } from '../rules';
import { parseObjectResponse } from '../redis';

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

function getId(rule: Rule | string): string {
  if (typeof rule === 'string') return rule;
  return rule.id;
}

export class RuleScripts {
  static async execRuleAction(
    queue: Queue,
    rule: Rule | string,
    action: string,
    parameter?: string | number | Record<string, any>,
    timestamp?: number,
  ): Promise<any> {
    timestamp = timestamp || systemClock.getTime();

    if (parameter === undefined) {
      parameter = '';
    } else if (typeof parameter !== 'string') {
      parameter = JSON.stringify(parameter);
    }

    const id = getId(rule);
    const args = [
      getRuleKey(queue, id),
      getRuleStateKey(queue, id),
      getAlertsKey(queue, id),
      getQueueBusKey(queue),
      id,
      timestamp,
      action,
      parameter,
    ];

    const client = await queue.client;
    return (client as any).rules(...args);
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

    const result: CheckAlertResult = {
      status: res['status'],
      alertCount: res['alerts'] ?? 0,
      failures: res['failures'] ?? 0,
      endDelay: res['endDelay'] ?? 0,
      state: (res['state'] ?? CircuitState.CLOSED) as CircuitState,
      notify: parseBool(res['notify'], false),
    };
    return result;
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
    queue: Queue,
    rule: Rule | string,
    data: AlertData,
    timestamp?: number,
  ): Promise<RuleAlert> {
    const val = await RuleScripts.execRuleAction(
      queue,
      rule,
      'alert',
      data,
      timestamp,
    );
    // await RuleScripts.updateQueueAlertCount(queue);
    try {
      const temp = JSON.parse(val);
      return temp as RuleAlert;
    } catch (e) {
      return null;
    }
  }

  static async updateQueueAlertCount(queue: Queue): Promise<number> {
    const ruleIndexKey = getRuleKey(queue);
    const countsKey = getQueueAlertCountKey(queue);
    const client = await queue.client;
    return (client as any).updateQueueAlertCount(ruleIndexKey, countsKey);
  }

  static async getQueueAlertCount(queue: Queue): Promise<number> {
    const countsKey = getQueueAlertCountKey(queue);
    const client = await queue.client;
    const count = await client.get(countsKey);
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
