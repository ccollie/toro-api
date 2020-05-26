'use strict';
import boom from '@hapi/boom';
import nanoid from 'nanoid';
import Emittery from 'emittery';
import { clone, isObject, isString, isNil } from 'lodash';
import { SlidingJobCounter } from '../lib';
import { parseDuration, parseTimestamp } from '../../lib/datetime';
import { systemClock } from '../../lib/clock';
import { isNumber } from '../../lib/utils';
import { getSlidingWindowDefaults } from '../lib/utils';
import { Query, QueryContext } from '../../query';
import { QueueListener } from '../queues';
import { ruleConfigSchema } from './rule-config';
import { RuleAlertOptions, RuleConfigOptions, StatsWindow } from '@src/types';
import { createDebug } from '../../lib/debug';

const debug = createDebug('rules');

const STATE = Symbol('state');
const TRIGGERED = Symbol('triggered');
const VALID = Symbol('valid');
const COUNTER = Symbol('counter');
const WARMING_UP = Symbol('warming up');
const WARMUP_TIMEOUT = Symbol('warmup-timeout');
const VOLUME_THRESHOLD = Symbol('volume-threshold');
const ALERT_TIMEOUT = Symbol('alert-timeout');
const ALERT_COUNT = Symbol('alert-count');
const CAN_NOTIFY = Symbol('can-notification');

function _clearTimeout(self, propKey): void {
  const timer = self[propKey];
  if (timer) {
    clearTimeout(timer);
    self[propKey] = null;
  }
}

/**
 * @param {Rule} rule This current rule
 * @returns {void}
 * @private
 */
function _startAlertDelayTimer(rule): void {
  if (!rule.options.alertDelay) {
    _clearTimeout(rule, ALERT_TIMEOUT);
    return;
  }
  const timer = (rule[ALERT_TIMEOUT] = setTimeout(() => {
    rule[ALERT_TIMEOUT] = null;
    rule[ALERT_COUNT] = 0;
  }, rule.options.alertDelay));

  timer.unref();
}

function destroyQuery(rule): void {
  if (rule.query) {
    rule.query.destroy();
    rule.query = null;
  }
}

// todo: tags, copy ctor

/** Class representing a rule used to trigger an alert based on a condition.
 * @extends Emittery
 * @property {string} id id of the {@link Rule} (required)
 * @property {string} name name for the {@link Rule} (required)
 * @property {string} [description] description for the {@link Rule}
 * @property {Date|Number} createdAt created date.
 * @property {Date|Number} updatedAt last updated date.
 * @property {Object} condition the mongo-like condition which should trigger an alert
 * @property {Object} [payload] optional alert data
 * @property {string[]} notifiers channels for alert notifications.
 * @property {Boolean} [active=true] true if the {@link Rule} is active (will generate alerts).
 * @property {Boolean} [persist=true] true if alerts are preserved in Redis.
 */
export class Rule extends Emittery {
  public readonly id: string;
  public queueId: string;
  public name: string;
  public description: string;
  public readonly createdAt: number;
  public updatedAt?: number;
  public notifiers: string[];
  public active: boolean;
  public persist: boolean;
  public payload: object;
  public condition: any = {};
  private readonly options: RuleAlertOptions;
  private alertStart?: number;
  private query: Query;
  private _started = false;
  private queueListener: QueueListener;
  public readonly window: StatsWindow;

  /**
   * Constructs a {@link Rule}. A Rule sets conditions for actions and rules based
   * on the state of queues and (possibly) getJobs.
   *
   * @class Rule
   * @extends Emittery
   * @param {RuleConfigOptions} config configuration for the {@link Rule}
   */
  constructor(config: RuleConfigOptions) {
    super();

    const { error, value: opts } = ruleConfigSchema.validate(config);
    if (error) {
      throw error;
    }
    const {
      id,
      name,
      condition,
      active,
      persist,
      payload,
      notifiers,
      description,
    } = opts;

    /**
     * @property {string} id the unique id of the {@link Rule}.
     */
    this.id = id || nanoid(8);
    this.options = { ...config.options };
    this.window = config.window || getSlidingWindowDefaults();

    this.createdAt = opts.createdAt
      ? parseTimestamp(opts.createdAt)
      : systemClock.now();
    this.updatedAt = opts.updatedAt
      ? parseTimestamp(opts.createdAt)
      : this.createdAt;

    this.name = name;

    /**
     * @property {string} description a description for the rule. Useful for UI.
     */
    this.description = description;

    this.active = active ?? true;
    this.persist = persist ?? true;
    this.payload = payload;

    this.notifiers = notifiers ?? [];

    // Alerts should go somewhere, so if we're active, make sure they're
    // persisted or broadcast to a notification channel. Note that we
    // may need to reconsider this in light of dynamic subscriptions (e.g. graphql)
    if (!this.notifiers.length && (!this.active || !this.persist)) {
      throw boom.badRequest(
        'At least one notifier must be specified for an rule',
      );
    }

    // todo: basic condition validation
    this.condition = condition;

    this.alertStart = null;

    this[STATE] = VALID;
    this[CAN_NOTIFY] = true;
    this[ALERT_COUNT] = 0;
  }

  /**
   * @property {Number} [warmup=0] a timeout after startup (in ms) during which
   * no alerts are raised, irrespective of truthiness of the rule condition
   */
  get warmup(): number {
    return this.options ? this.options.warmup : 0;
  }

  // protected
  /**
   * @type {Boolean}
   */
  get isBelowVolumeThreshold(): boolean {
    // todo: if we're past the threshold, we can dispose of
    // the counter
    return this.volume < this.volumeThreshold;
  }

  /**
   * @type {Number} the number of getJobs processed to this point.
   */
  get volume(): number {
    const counter = this[COUNTER];
    return counter ? counter.completed : 0;
  }

  /**
   * Gets the volume threshold for this rule
   * @type {Boolean}
   */
  get volumeThreshold() {
    return this[VOLUME_THRESHOLD];
  }

  /**
   * Returns true if this rule in an alerted state.
   * @type {Boolean}
   */
  get isTriggered(): boolean {
    return this[STATE] === TRIGGERED;
  }

  /**
   * Gets whether the we're currently in warm up phase
   * @type {Boolean}
   */
  get isWarmingUp(): boolean {
    return !!this[WARMING_UP];
  }

  /**
   * The number of alerts raised for the current event
   * @type {Number}
   */
  get alertCount(): number {
    return this[ALERT_COUNT];
  }

  get isInAlertDelay(): boolean {
    return !!this[ALERT_TIMEOUT];
  }

  clear(): void {
    this[STATE] = VALID;
    this.alertStart = null;
  }

  /**
   * Clean up all resource associated with the {@link Rule}
   */
  destroy(): void {
    this.stop();
  }

  /**
   * Sets the conditions to run when evaluating the rule.
   */
  private startListening(): void {
    const listener = this.queueListener;
    destroyQuery(this);
    const context = new QueryContext(listener, this.options);
    this.query = new Query(this.condition, context);
    // setup listeners
    const update = (data): void => {
      // execute on next tick since emittery calls
      // all handlers asynchronously, meaning there's no guarantee this gets
      // called last
      global.process.nextTick(() => {
        this.onUpdate(data).catch((err) => {
          console.log(err);
        });
      });
    };

    context.registerCleanup(listener.on('job.finished', update));

    // if we have any aggregates (they are sliding window based) we have to
    // react as the window moves along
    if (context.isAggregate) {
    }
  }

  private setVolumeThreshold(): void {
    if (!isObject(this.options.volumeThreshold)) {
      return;
    }

    const { value = 0, window } = this.options.volumeThreshold;

    this[VOLUME_THRESHOLD] = value;
    if (value) {
      if (window) {
        const { duration, period } = window;
        this[COUNTER] = new SlidingJobCounter(this.queueListener, {
          duration,
          period,
        });
      } else {
        // todo: use a simple counter
      }
    }
  }

  private startWarmup(): void {
    if (isNumber(this.warmup)) {
      this[WARMUP_TIMEOUT] = setTimeout(() => {
        this[WARMING_UP] = false;
      }, parseDuration(this.warmup));
      this[WARMING_UP] = true;
      this[WARMUP_TIMEOUT].unref();
    } else {
      this[WARMING_UP] = false;
    }
  }

  start(listener: QueueListener): void {
    if (!this._started) {
      this.queueListener = listener;
      this.startWarmup();
      this.setVolumeThreshold();
      this.startListening();
      this._started = true;
    }
  }

  stop(): void {
    if (this._started) {
      _clearTimeout(this, WARMUP_TIMEOUT);
      _clearTimeout(this, ALERT_TIMEOUT);

      const counter = this[COUNTER];
      if (counter) {
        counter.destroy();
      }

      this.clearListeners();
      this.queueListener = null;
      destroyQuery(this);
      this._started = false;
    }
  }

  public static fromJSON(json: string | any): Rule {
    if (isString(json)) {
      json = JSON.parse(json);
    }
    if (isNil(json)) {
      throw boom.badRequest('Expected a JSON object or JSON encoded string');
    }
    return new Rule(json);
  }

  toJSON(): object {
    const options = clone(this.options);
    const createdAt = this.createdAt
      ? parseTimestamp(this.createdAt)
      : undefined;
    const updatedAt = this.updatedAt
      ? parseTimestamp(this.updatedAt)
      : undefined;

    return {
      id: this.id,
      name: this.name,
      description: this.description,
      createdAt,
      updatedAt,
      options,
      condition: clone(this.condition),
      active: this.active,
      persist: this.persist,
      notifiers: [...this.notifiers],
      payload: clone(this.payload),
    };
  }

  private _constructObject(data = {}): object {
    const context = this.query.context;
    const { job, latency, wait } = data as Record<string, any>;
    let obj = {
      ...job,
      latency,
      wait,
    };
    obj = context.getMetricValues(obj);
    return context.getAggregatorValues(obj);
  }

  async onUpdate(data = {}): Promise<void> {
    // todo: if we've exceed the volume threshold, we can stop the timer and unlisten
    const obj = this._constructObject(data);
    const success = this.query.test(obj);
    const status = success ? 'pass' : 'fail'; // todo: change to "trigger" and "reset"
    // todo: use queue specific task queue so we dont have to wait here
    await this.emit(status, this);
    if (this.skipCheck()) {
      return;
    }
    return success ? this.trigger(obj) : this.reset(obj);
  }

  trigger(state = {}): Promise<void> {
    const emit = async (): Promise<void> => {
      this.alertStart = systemClock.now();

      const { name, description, payload, alertStart: start } = this;
      /**
       * Emitted when an error alert is tripped
       * @event Rule#failure
       */
      const alert = {
        name,
        description,
        start,
        state,
        payload,
      };

      await this.emit('alert.triggered', alert);

      this[ALERT_COUNT] = (this[ALERT_COUNT] || 0) + 1;
    };

    if (this[STATE] !== TRIGGERED) {
      this[STATE] = TRIGGERED;
      this[ALERT_COUNT] = 0;
      _startAlertDelayTimer(this);
    }

    const emitLimit = this.options.repeatsPerTrigger;
    if (!this.isInAlertDelay && (!emitLimit || this.alertCount < emitLimit)) {
      return emit();
    }
  }

  /**
   * Resets the alert state for this rule
   * @private
   * @param {Object} state queue state which triggered the alert
   * @return {Promise<void>}
   */
  reset(state): Promise<void> {
    if (this[STATE] !== VALID) {
      this[STATE] = VALID;

      this[ALERT_COUNT] = 0;
      _clearTimeout(this, ALERT_TIMEOUT);

      this.alertStart = null;

      if (!!this.options.alertOnReset) {
        const alert = {
          name: this.name,
          description: this.description,
          start: this.alertStart,
          end: systemClock.now(),
          state,
          payload: this.payload, // todo: support interpolation
        };

        return this.emit('alert.reset', alert);
      }
    }
  }

  /**
   * Determines whether we should evaluate the condition
   * @type {Boolean}
   */
  skipCheck(): boolean {
    return this.isWarmingUp || this.isBelowVolumeThreshold;
  }
}
