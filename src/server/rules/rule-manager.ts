import pMap from 'p-map';
import ms from 'ms';
import LRUCache from 'lru-cache';
import { Rule, RuleStateChangeEvent } from './rule';
import { Queue } from 'bullmq';
import {
  NotificationContext,
  RuleAlert,
  RuleConfigOptions,
  RuleEventsEnum,
} from '../../types';
import { RuleAlertFilter, RuleStorage } from './rule-storage';
import { BusEventHandler, EventBus, UnsubscribeFn } from '../redis';
import { BaseMetric, MetricsListener } from '../metrics';
import { QueueListener, QueueManager } from '../queues';
import { Clock, IteratorOptions, logger } from '../lib';
import { NotificationManager } from '../hosts';
import { RuleEvaluator } from './rule-evaluator';
import { createRuleTemplateHelpers } from './rule-template-helpers';
import handlebars from 'handlebars';

type RuleLike = Rule | RuleConfigOptions | string;

/* eslint @typescript-eslint/no-use-before-define: 0 */
const getRuleId = (rule: RuleLike): string => {
  if (typeof rule === 'string') return rule;
  return rule?.id || '';
};

function getRuleTemplateKey(rule: RuleLike): string {
  const id = getRuleId(rule);
  return `rule-template:${id}`;
}

/**
 * Manages the storage of {@link Rule} and alert instances related to a queue
 */
export class RuleManager {
  public readonly storage: RuleStorage;
  public readonly notifications: NotificationManager;
  public readonly metricsListener: MetricsListener;
  // RuleId tp evaluator map
  private readonly _evalMap = new Map<string, RuleEvaluator>();
  private readonly cache: LRUCache;
  private readonly queueManager: QueueManager;
  private readonly notificationContext: NotificationContext;

  /**
   * Construct a {@link RuleManager}
   * @param queueManager
   */
  constructor(queueManager: QueueManager) {
    this.queueManager = queueManager;
    const host = queueManager.hostManager.name;
    this.queueManager = queueManager;
    this.storage = new RuleStorage(host, this.queue, this.bus);
    this.notifications = queueManager.hostManager.notifications;
    this.onError = this.onError.bind(this);
    this.dispatchRuleStateChange = this.dispatchRuleStateChange.bind(this);
    this.metricsListener = new MetricsListener(this.queueListener);
    this.cache = new LRUCache({
      max: 250,
      maxAge: ms('1 hour'),
    });
    this.notificationContext = queueManager.hostManager.createNotificationContext();
  }

  destroy(): void {
    for (const evaluator of this._evalMap.values()) {
      const rule = evaluator.rule;
      evaluator.destroy();
      rule.destroy();
    }
    this.metricsListener.destroy();
  }

  startListening(start?: string): Promise<void> {
    return this.queueListener.startListening(start);
  }

  stopListening(): Promise<void> {
    return this.queueListener.unlisten();
  }

  get metrics(): BaseMetric[] {
    return this.metricsListener.metrics;
  }

  get clock(): Clock {
    return this.metricsListener.clock;
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
    const rules = new Array<Rule>(this._evalMap.size);
    let i = 0;
    for (const [, evaluator] of this._evalMap) {
      rules[i++] = evaluator.rule;
    }
    return rules;
  }

  get hasLock(): boolean {
    return this.queueManager.hasLock;
  }

  private getMetric(id: string): BaseMetric {
    return this.metrics.find((x) => x.id === id);
  }

  private dispatchRuleStateChange(event: RuleStateChangeEvent): void {
    if (this.hasLock) {
      const { state, ts, rule } = event;
      const { id, name, prefix } = this.queueManager;
      const queue = { id, name, prefix };
      const payload = {
        state,
        ts,
        id: rule.id,
        queue,
      };
      // todo: update rule states in redis !!!
      this.bus.emit(RuleEventsEnum.STATE_CHANGED, payload).catch(this.onError);
    }
  }

  private getMessageTemplate(rule: Rule): handlebars.TemplateDelegate<any> {
    const key = getRuleTemplateKey(rule);
    let template = this.cache.get(key) as handlebars.TemplateDelegate<any>;
    if (!template && rule.message) {
      template = handlebars.compile(rule.message);
      this.cache.set(key, template);
    }
    return template;
  }

  private deleteMessageTemplate(rule: RuleLike): void {
    const key = getRuleTemplateKey(rule);
    this.cache.del(key);
  }

  private getAlertMessage(rule: Rule, context: Record<string, any>): string {
    const template = this.getMessageTemplate(rule);
    if (template) {
      const helpers = createRuleTemplateHelpers(context.event, context);
      return template(context, { helpers });
    }
    return null;
  }

  private getTemplateData(
    rule: Rule,
    context: Record<string, any>,
  ): Record<string, any> {
    const { id, name, prefix, uri } = this.queueManager;
    const queue = { name, prefix, id, uri };
    // todo: rule uri
    return {
      ...this.notificationContext,
      ...context,
      queue,
      rule: {
        id: rule.id,
        name: rule.name,
      },
    };
  }

  private dispatchAlert(rid: string, alert: RuleAlert): void {
    if (this.hasLock) {
      const calls = [];
      const rule = this._evalMap.get(rid)?.rule;

      const templateData = this.getTemplateData(rule, alert);
      alert.message = templateData['message'] = this.getAlertMessage(
        rule,
        templateData,
      );

      calls.push(this.storage.addAlert(rule, alert));

      if (rule.channels.length) {
        calls.push(this.notifyAlert(rule, templateData));
      }

      Promise.all(calls).catch(this.onError);
    }
  }

  private _registerRule(rule: Rule): void {
    const id = getRuleId(rule);
    let evaluator = this._evalMap.get(id);
    if (!evaluator) {
      evaluator = new RuleEvaluator(rule, this.metricsListener);
      this._evalMap.set(id, evaluator);

      const dispatch = (eventData: RuleAlert) => {
        this.dispatchAlert(id, eventData);
      };

      rule.on(RuleEventsEnum.STATE_CHANGED, this.dispatchRuleStateChange);
      rule.on(RuleEventsEnum.ALERT_TRIGGERED, dispatch);
      rule.on(RuleEventsEnum.ALERT_RESET, dispatch);
    }
    rule.start(this.clock);
  }

  async addRule(options: RuleConfigOptions): Promise<Rule> {
    const rule = await this.storage.addRule(options);
    this._registerRule(rule);
    return rule;
  }

  /*
   * Fetch a rule by id
   * @param {string} id
   * @returns {Promise<Rule>}
   */
  async getRule(id: string): Promise<Rule> {
    let rule = this._evalMap.get(id)?.rule;
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
    return !!this._evalMap.get(id);
  }

  getRuleByName(name: string): Rule {
    for (const [, v] of this._evalMap) {
      if (v.rule.name === name) return v.rule;
    }
    return null;
  }

  /**
   * Update a rule
   * @param {Rule} rule
   * @returns {Promise<Rule>}
   */
  async updateRule(rule: Rule | RuleConfigOptions): Promise<Rule> {
    const id = getRuleId(rule);
    const saved = await this.getRule(id);
    const updated = await this.storage.updateRule(rule);
    // todo: rebuild rule if condition changed
    // replace in listener
    if (saved) {
      this.deleteMessageTemplate(rule);
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

  async deleteRule(rule: Rule | string): Promise<boolean> {
    const isDeleted = await this.storage.deleteRule(rule);
    if (isDeleted && this.hasRule(rule)) {
      const id = getRuleId(rule);
      const evaluator = this._evalMap.get(id);
      if (evaluator) {
        evaluator.rule.clearListeners();
        // todo: metric may possibly be reference by more than one rule
        // use refCounts
        const metric = evaluator.metric;
        if (metric) {
          this.metricsListener.unregisterMetric(metric);
          metric.destroy();
        }
        evaluator.destroy();
      }
      this._evalMap.delete(id);
    }
    return isDeleted;
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

  async getRuleAlertCount(rule: Rule | string): Promise<number> {
    return this.storage.getRuleAlertCount(rule);
  }

  async clearAlerts(rule: Rule | string): Promise<number> {
    return this.storage.clearAlerts(rule);
  }

  private notifyAlert(rule: Rule, info: Record<string, any>): Promise<number> {
    return this.notifications.dispatch(info.event, info, rule.channels);
  }

  /**
   * Prune alerts according to a retention duration
   * @param {Number} retention in ms. Alerts before (getTime - retention) will be removed
   * @returns {Promise<Number>}
   */
  async pruneAlerts(retention: number): Promise<number> {
    const ids = await this.storage.getRuleIds();
    if (ids.length) {
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
  async onAlertEvent(
    eventName: string,
    ruleId: string | null,
    handler: BusEventHandler,
  ): Promise<UnsubscribeFn> {
    const fn = (alert: RuleAlert) => {
      if (!ruleId || ruleId === alert.ruleId) {
        return handler(alert);
      }
    };

    return this.bus.on(eventName, fn);
  }

  async onAlertTriggered(
    ruleId: string | null,
    handler: BusEventHandler,
  ): Promise<UnsubscribeFn> {
    return this.onAlertEvent(RuleEventsEnum.ALERT_TRIGGERED, ruleId, handler);
  }

  async onAlertReset(
    ruleId: string | null,
    handler: BusEventHandler,
  ): Promise<UnsubscribeFn> {
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
