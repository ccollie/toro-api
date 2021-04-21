import { Queue } from 'bullmq';
import { ErrorLevel, RuleAlert, RuleState } from '../../types';
import {
  getAlertsKey,
  getQueueBusKey,
  getRuleKey,
  getRuleStateKey,
  parseBool,
  systemClock,
} from '../lib';
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
  active: boolean;
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
    parameter?: string | Record<string, any>,
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
    result.active = parseBool(res['active']);

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
    try {
      const temp = JSON.parse(val);
      return temp as RuleAlert;
    } catch (e) {
      return null;
    }
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
}
