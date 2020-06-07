import { EventEmitter } from 'events';
import config from '../config';
import { JobFields } from '../models/jobs';
import { resolve } from './utils';
import { QueueListener } from '../queues';
import * as metrics from '../metrics';
import {
  BaseMetric,
  MetricType,
  create as createMetric,
} from '../metrics';

const defaultSlidingWindow = config.getValue('defaultSlidingWindow');

interface FieldValueResolver {
  (obj: object): any;
}

export class QueryContext extends EventEmitter {
  private readonly queueListener: QueueListener;
  public readonly fields = new Set<string>();
  private readonly fieldHandlers = new Map<string, FieldValueResolver>();
  private readonly metrics = new Map<string, BaseMetric>();
  private readonly cleanups: any[];
  private aggregators: any[];
  private readonly windowOptions: any;

  constructor(queueListener: QueueListener, options) {
    super();
    this.queueListener = queueListener;
    this.windowOptions = {
      ...defaultSlidingWindow,
      ...((options && options.slidingWindow) || {}),
    };
  }

  destroy(): void {
    this.clear();
  }

  get isAggregate(): boolean {
    return !!this.aggregators.length;
  }

  getMetricValues(obj = {}): Record<string, any> {
    this.metrics.forEach((metric, name) => {
      obj[name] = metric.value;
    });
    return obj;
  }

  getAggregatorValues(obj = {}): Record<string, any> {
    this.aggregators.forEach((aggregator, name) => {
      obj[name] = aggregator.value;
    });
    return obj;
  }

  getBaseJobFields(): string[] {
    const res = [];
    this.fieldHandlers.forEach((_, name) => {
      const parts = name.split('.');
      res.push(parts.length ? parts[0] : name);
    });

    return res;
  }

  isValidJobField(name: string): boolean {
    if (!name || !name.length) return false;
    const parts = name.split('.');
    return JobFields.includes(parts[0]);
  }

  isValidMetric(name: string): boolean {
    return !!metrics.getByKey(name);
  }

  isValidField(name: string): boolean {
    return this.isValidJobField(name) || this.isValidMetric(name);
  }

  addField(name: string): void {
    if (this.isValidJobField(name)) {
      this.fields.add(name);
    } else {
      this.addMetric(name as MetricType);
    }
  }

  addMetric(name: MetricType): BaseMetric {
    let metric = this.metrics.get(name);
    if (!metric) {
      metric = createMetric(this.queueListener, name, this.windowOptions);
      this.metrics.set(name, metric);
      this.registerCleanup(() => metric.destroy());
      // todo: subscribe to update method
    }
    return metric;
  }

  addAggregator(aggregator): void {
    const exists = this.aggregators.find((x) => x === aggregator);
    if (!exists) {
      this.aggregators.push(aggregator);
      this.registerCleanup(() => aggregator.destroy());
    }
  }

  getFieldResolver(field: string): FieldValueResolver {
    let handler = this.fieldHandlers.get(field);
    if (!handler) {
      if (this.isValidJobField(field)) {
        this.addField(field);
        handler = (obj) => resolve(obj, field);
      } else if (this.isValidMetric(field)) {
        const metric = this.addMetric(field as MetricType);
        handler = () => metric.value;
      } else {
        // todo: this should probably raise an error
        handler = (obj) => resolve(obj, field);
      }
      if (handler) {
        this.fieldHandlers.set(field, handler);
      }
    }

    return handler;
  }

  registerCleanup(dtor): void {
    this.cleanups.push(dtor);
  }

  clear(): void {
    this.cleanups.forEach((fn) => fn());
    this.fieldHandlers.clear();
    this.fields.clear();
    this.metrics.clear();
    this.aggregators = [];
  }
}
