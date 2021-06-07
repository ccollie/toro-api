import boom from '@hapi/boom';
import pMap from 'p-map';
import ms from 'ms';
import { Rule } from './rule';
import { Queue } from 'bullmq';
import { RuleAlert, RuleConfigOptions, RuleEventsEnum } from '../../types';
import { RuleAlertFilter, RuleStorage } from './rule-storage';
import { BusEventHandler, EventBus, UnsubscribeFn } from '../redis';
import { BaseMetric, MetricUpdateEvent } from '../metrics';
import { QueueListener, QueueManager } from '../queues';
import { Clock, IteratorOptions, logger } from '../lib';
import { RuleEvaluator } from './rule-evaluator';
import { RuleAlerter } from './rule-alerter';
import { RuleAlertState, RuleScripts } from '@server/commands';

type RuleLike = Rule | RuleConfigOptions | string;

/* eslint @typescript-eslint/no-use-before-define: 0 */
const getRuleId = (rule: RuleLike): string => {
  if (typeof rule === 'string') return rule;
  return rule?.id || '';
};

const DEFAULT_RETENTION = ms('2 weeks');

/**
 * Manages the storage of {@link Rule} and alert instances related to a queue
 */
export class RuleManager {
  public readonly storage: RuleStorage;
  public readonly clock: Clock;
  // RuleId to evaluator map
  private readonly _evaluators = new Map<string, RuleEvaluator>();
  private readonly _alerters = new Map<string, RuleAlerter>();
  private readonly queueManager: QueueManager;

  /**
   * Construct a {@link RuleManager}
   * @param queueManager
   */
  constructor(queueManager: QueueManager) {
    this.queueManager = queueManager;
    this.storage = new RuleStorage(this.queue, this.bus);
    this.onError = this.onError.bind(this);
    this.clock = queueManager.clock;
  }

  destroy(): void {
    for (const evaluator of this._evaluators.values()) {
      evaluator.destroy();
    }
    for (const handler of this._alerters.values()) {
      handler.destroy();
    }
  }

  startListening(start?: string): Promise<void> {
    return this.queueListener.startListening(start);
  }

  stopListening(): Promise<void> {
    return this.queueListener.unlisten();
  }

  get queueListener(): QueueListener {
    return this.queueManager.queueListener;
  }

  get queue(): Queue {
    return this.queueManager.queue;
  }

  get bus(): EventBus {
    return this.queueManager.bus;
  }

  get rules(): Rule[] {
    const rules = new Array<Rule>(this._evaluators.size);
    let i = 0;
    for (const [, evaluator] of this._evaluators) {
      rules[i++] = evaluator.rule;
    }
    return rules;
  }

  findRuleByName(name: string): Rule {
    return this.rules.find((r) => r.name === name);
  }

  get hasLock(): boolean {
    return this.queueManager.hasLock;
  }

  private findMetric(rule: Rule): BaseMetric {
    return this.queueManager.findMetric(rule.metricId);
  }

  private _registerRule(rule: Rule): void {
    const id = getRuleId(rule);
    let evaluator = this._evaluators.get(id);
    if (!evaluator) {
      const metric = this.findMetric(rule);
      if (!metric) {
        // todo: throw
        return;
      }
      evaluator = new RuleEvaluator(rule, metric);
      const alertHandler = new RuleAlerter(this.queueManager, rule, this.clock);

      this._evaluators.set(id, evaluator);
      this._alerters.set(id, alertHandler);

      const dispatch = (evt: MetricUpdateEvent): void => {
        const handler = this._alerters.get(id);
        const rule = handler?.rule;
        if (rule && rule.isActive) {
          const result = evaluator.evaluate(evt.value);
          // put this check AFTER the above since evaluators may be stateful, and we
          // need to maintain state in case we acquire the lock
          if (!this.hasLock) return;
          handler.handleResult(result).catch((err) => {
            // handle delete
            if (boom.isBoom(err, 404)) {
              this.removeRule(id);
            }
            this.onError(err);
          });
        }
      };

      metric.onUpdate(dispatch);
      evaluator.unsubscribe = () => metric.offUpdate(dispatch);

      this.queueManager.addWork(() => alertHandler.start());
    }
  }

  async addRule(options: RuleConfigOptions): Promise<Rule> {
    const queueId = this.queueManager.id;
    const rule = await this.storage.createRule(options, queueId);
    this._registerRule(rule);
    return rule;
  }

  /*
   * Fetch a rule by id
   * @param {string} id
   * @returns {Promise<Rule>}
   */
  async getRule(id: string): Promise<Rule> {
    let rule = this._evaluators.get(id)?.rule;
    if (!rule) {
      rule = await this.storage.getRule(id);
      if (rule) {
        this._registerRule(rule);
      }
    }
    return rule;
  }

  hasRule(rule: Rule | string): boolean {
    const id = getRuleId(rule);
    return !!this._evaluators.get(id);
  }

  getRuleByName(name: string): Rule {
    for (const [, v] of this._evaluators) {
      if (v.rule.name === name) return v.rule;
    }
    return null;
  }

  async createRule(opts: RuleConfigOptions): Promise<Rule> {
    const queueId = this.queueManager.id;
    const rule = await this.storage.createRule(opts, queueId);
    this._registerRule(rule);
    return rule;
  }

  /**
   * Update a rule
   * @param {Rule} rule
   * @returns {Promise<Rule>}
   */
  async updateRule(rule: Rule): Promise<Rule> {
    const id = getRuleId(rule);
    const saved = await this.getRule(id);
    const updated = await this.storage.saveRule(rule);
    // todo: rebuild rule if condition changed
    // replace in listener
    if (saved) {
      saved.isActive = false;
    }
    return updated;
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
    const val = await this.storage.setRuleStatus(rule, isActive);
    const id = getRuleId(rule);
    const found = await this.getRule(id);
    if (found) {
      found.isActive = val;
    }
    return val;
  }

  private removeRule(rule: Rule | string): void {
    const id = getRuleId(rule);
    if (this.hasRule(rule)) {
      const evaluator = this._evaluators.get(id);
      if (evaluator) {
        evaluator.destroy();
        this._evaluators.delete(id);
      }
      const alertHandler = this._alerters.get(id);
      if (alertHandler) {
        alertHandler.destroy();
        this._alerters.delete(id);
      }
    }
  }

  async deleteRule(rule: Rule | string): Promise<boolean> {
    const isDeleted = await this.storage.deleteRule(rule);
    if (isDeleted) {
      this.removeRule(rule);
    }
    return isDeleted;
  }

  async getRuleStatus(rule: Rule | string): Promise<RuleAlertState> {
    return RuleScripts.getState(this.queue, rule);
  }

  /**
   * Return rules from storage
   * @param {String} sortBy {@link Rule} field to sort by
   * @param {Boolean} asc
   * @return {Promise<[Rule]>}
   */
  async getRules(sortBy = 'createdAt', asc = true): Promise<Rule[]> {
    return this.storage.getRules(sortBy, asc);
  }

  async loadRules(): Promise<Rule[]> {
    const rules = await this.getRules();
    rules.forEach((r) => {
      this._registerRule(r);
    });
    return rules;
  }

  // Alerts

  async addAlert(rule: Rule | string, data: RuleAlert): Promise<RuleAlert> {
    return this.storage.addAlert(rule, data);
  }

  /**
   * Get an alert by {@link Rule} and id
   * @param {Rule|string} rule
   * @param {string} id alert id
   * @return {Promise<RuleAlert>}
   */
  async getAlert(rule: Rule | string, id: string): Promise<RuleAlert> {
    return this.storage.getAlert(rule, id);
  }

  async deleteAlert(rule: Rule | string, id: string): Promise<boolean> {
    return this.storage.deleteAlert(rule, id);
  }

  async markAlertAsRead(
    rule: Rule | string,
    id: string,
    value: boolean,
  ): Promise<RuleAlert> {
    return this.storage.markAlertAsRead(rule, id, value);
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
    return this.storage.getRuleAlerts(rule, start, end, asc);
  }

  async getRuleAlertCount(rule?: Rule | string): Promise<number> {
    if (rule === undefined) {
      return this.storage.getQueueAlertCount();
    }
    return this.storage.getRuleAlertCount(rule);
  }

  async clearAlerts(rule: Rule | string): Promise<number> {
    return this.storage.clearAlerts(rule);
  }

  /**
   * Prune alerts according to a retention duration
   * @param {Number} retention in ms. Alerts before (getTime - retention) will be removed
   * @returns {Promise<Number>}
   */
  async pruneAlerts(retention?: number): Promise<number> {
    const ids = await this.storage.getRuleIds();
    if (ids.length) {
      retention = retention || DEFAULT_RETENTION;
      const keys = ids.map((id) => this.storage.getRuleKey(id));
      const counts = await pMap(
        keys,
        (key) => this.storage.pruneAlerts(key, retention),
        { concurrency: 4 },
      );
      return counts.reduce((res, count) => res + count, 0);
    }
    return 0;
  }

  onError(err: Error): void {
    console.log(err.message || err);
    logger.warn(err);
  }

  // Events
  onAlertEvent(
    eventName: string,
    ruleId: string | null,
    handler: BusEventHandler,
  ): UnsubscribeFn {
    const fn = (alert: RuleAlert) => {
      if (!ruleId || ruleId === alert.ruleId) {
        return handler(alert);
      }
    };

    return this.bus.on(eventName, fn);
  }

  onAlertTriggered(
    ruleId: string | null,
    handler: BusEventHandler,
  ): UnsubscribeFn {
    return this.onAlertEvent(RuleEventsEnum.ALERT_TRIGGERED, ruleId, handler);
  }

  onAlertReset(ruleId: string | null, handler: BusEventHandler): UnsubscribeFn {
    return this.onAlertEvent(RuleEventsEnum.ALERT_RESET, ruleId, handler);
  }

  subscribeToAlerts(options?: RuleAlertFilter): AsyncIterator<RuleAlert> {
    let filter: (eventName: string, value?: RuleAlert) => boolean;
    const ruleIds = options?.ruleIds || [];
    if (options && !!ruleIds.length) {
      filter = (eventName: string, value?: RuleAlert): boolean => {
        return value && ruleIds.includes(value.ruleId);
      };
    }
    const eventNames = options?.eventNames || [
      RuleEventsEnum.ALERT_RESET,
      RuleEventsEnum.ALERT_TRIGGERED,
    ];
    // todo: deleted ?
    const opts: IteratorOptions<RuleAlert> = {
      eventNames,
      filter,
    };
    return this.bus.createAsyncIterator<RuleAlert>(opts);
  }
}
