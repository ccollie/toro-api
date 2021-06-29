import boom from '@hapi/boom';
import pMap from 'p-map';
import ms from 'ms';
import { Rule } from './rule';
import { Queue } from 'bullmq';
import { RuleAlert, RuleConfigOptions, RuleEventsEnum } from '../../types';
import {
  RuleAddedEventData,
  RuleAlertFilter,
  RuleDeletedEventData,
  RuleEventData,
  RuleStorage,
} from './rule-storage';
import { BusEventHandler, EventBus, UnsubscribeFn } from '../redis';
import { BaseMetric } from '../metrics';
import { QueueListener, QueueManager } from '../queues';
import { Clock, IteratorOptions, logger } from '../lib';
import { RuleEvaluator } from './rule-evaluator';
import { RuleAlerter } from './rule-alerter';
import { RuleAlertState, RuleScripts } from '@server/commands';
import { DateLike } from '@lib/datetime';

type RuleLike = Rule | RuleConfigOptions | string;

/* eslint @typescript-eslint/no-use-before-define: 0 */
const getRuleId = (rule: RuleLike): string => {
  if (typeof rule === 'string') return rule;
  return rule?.id || '';
};

const DEFAULT_RETENTION = ms('2 weeks');

interface RuleMeta {
  rule: Rule;
  evaluator?: RuleEvaluator;
  alerter: RuleAlerter;
}

/**
 * Manages the storage of {@link Rule} and alert instances related to a queue
 */
export class RuleManager {
  public readonly storage: RuleStorage;
  public readonly clock: Clock;
  private readonly _metas = new Map<string, RuleMeta>();
  private readonly metricRuleMap = new Map<string, Set<RuleMeta>>();
  private readonly queueManager: QueueManager;

  /**
   * Construct a {@link RuleManager}
   * @param queueManager
   */
  constructor(queueManager: QueueManager) {
    this.queueManager = queueManager;
    this.storage = new RuleStorage(queueManager.host, this.queue, this.bus);
    this.onError = this.onError.bind(this);
    this.clock = queueManager.clock;
    this.initSubscriptions();
  }

  destroy(): void {
    for (const [_, meta] of this._metas) {
      this.destroyMeta(meta);
    }
    this._metas.clear();
  }

  private removeMetricRule(metricId: string, meta: RuleMeta): void {
    const metricRules = this.metricRuleMap.get(metricId);
    if (metricRules) {
      metricRules.delete(meta);
      if (!metricRules.size) {
        this.metricRuleMap.delete(metricId);
      }
    }
  }

  private destroyMeta(meta: RuleMeta): void {
    const { evaluator, alerter, rule } = meta;
    evaluator?.destroy();
    alerter.destroy();
    this.removeMetricRule(rule.metricId, meta);
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
    const rules = new Array<Rule>(this._metas.size);
    let i = 0;
    for (const [, { rule }] of this._metas) {
      rules[i++] = rule;
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

  private dispatchRule(metric: BaseMetric, meta: RuleMeta, hasLock: boolean) {
    const { alerter, rule } = meta;
    if (rule && rule.isActive) {
      let evaluator = meta.evaluator;
      if (!evaluator) {
        evaluator = new RuleEvaluator(rule, metric);
        meta.evaluator = evaluator;
      }
      const result = evaluator.evaluate(metric.value);
      // put this check AFTER the above since evaluators may be stateful, and we
      // need to maintain state in case we acquire the lock
      if (!hasLock) return;
      // todo: addWork()
      alerter.handleResult(result).catch((err) => {
        // handle delete
        if (boom.isBoom(err, 404)) {
          this.destroyMeta(meta);
          this._metas.delete(rule.id);
        }
        this.onError(err);
      });
    }
  }

  handleMetricUpdate(metric: BaseMetric): void {
    const metas = this.metricRuleMap.get(metric.id);
    if (metas) {
      const hasLock = this.hasLock;
      metas.forEach((meta) => void this.dispatchRule(metric, meta, hasLock));
    }
  }

  private _registerRule(rule: Rule): void {
    const id = getRuleId(rule);
    let meta = this._metas.get(id);
    if (!meta) {
      const metricId = rule.metricId;
      let metricRules = this.metricRuleMap.get(metricId);
      if (!metricRules) {
        metricRules = new Set<RuleMeta>();
        this.metricRuleMap.set(metricId, metricRules);
      }

      const alerter = new RuleAlerter(this.queueManager, rule, this.clock);

      meta = { rule, alerter };
      this._metas.set(id, meta);
      metricRules.add(meta);

      this.queueManager.addWork(() => alerter.start());
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
    let rule = this._metas.get(id)?.rule;
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
    return !!this._metas.get(id);
  }

  getRuleByName(name: string): Rule {
    for (const [, v] of this._metas) {
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
      const meta = this._metas.get(id);
      if (meta) {
        this.destroyMeta(meta);
        this._metas.delete(id);
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
    start: DateLike = 0,
    end: DateLike | string = '$',
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

  // events
  private initSubscriptions() {
    const { bus } = this.queueManager;
    bus.on(RuleEventsEnum.RULE_ADDED, (data: RuleAddedEventData) =>
      this.onRuleAdded(data),
    );
    bus.on(RuleEventsEnum.RULE_DELETED, (data: RuleDeletedEventData) =>
      this.onRuleDeleted(data),
    );
    bus.on(RuleEventsEnum.RULE_ACTIVATED, (data: RuleEventData) =>
      this.onRuleActivated(data),
    );
    bus.on(RuleEventsEnum.RULE_DEACTIVATED, (data: RuleEventData) =>
      this.onRuleDeactivated(data),
    );
  }

  private async onRuleAdded(event: RuleAddedEventData): Promise<void> {
    try {
      const rule = await this.getRule(event.ruleId);
      if (rule) {
        this._registerRule(rule);
      }
    } catch (e) {
      this.onError(e);
    }
  }

  private onRuleDeleted(event: RuleDeletedEventData): void {
    this.removeRule(event.ruleId);
  }

  private onRuleActivated(event: RuleEventData): void {
    const meta = this._metas.get(event.ruleId);
    if (meta) meta.rule.isActive = true;
  }

  private onRuleDeactivated(event: RuleEventData): void {
    const meta = this._metas.get(event.ruleId);
    if (meta) meta.rule.isActive = false;
  }
}
