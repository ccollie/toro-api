import { isObject } from '../common/utils';
import Request from './request';

export type MetricType = 'latency' | 'wait' | 'throughput';

function getUrl(host: string, name: string, jobType = null, ...args) {
  const base = `queues/${encodeURIComponent(host)}/${encodeURIComponent(
    name,
  )}/metrics`;
  if (jobType) {
    args.unshift(jobType);
  }
  const fragment = args.join('/');
  return args.length ? `${base}/${fragment}` : base;
}

export class MetricsService {
  private readonly _request: Request;

  constructor(request: Request) {
    this._request = request;
  }

  getTypes() {
    return this._request.get('metrics');
  }

  getLatencySnapshot(host: string, name: string, jobType = null) {
    return this.fetch(host, name, jobType, 'latency', 'snapshot');
  }

  getLatency(host: string, name: string, jobType = null, options) {
    return this.fetch(host, name, jobType, 'latency', options);
  }

  getWaitTime(host: string, name: string, jobType = null, options = {}) {
    return this.fetch(host, name, jobType, 'wait', options);
  }

  getThroughput(host: string, name: string, jobType = null, options = {}) {
    return this.fetch(host, name, jobType, 'throughput', options);
  }

  getThroughputSnapshot(
    host: string,
    name: string,
    jobType = null,
    options = {},
  ) {
    return this.fetch(host, name, jobType, 'throughput', 'snapshot', options);
  }

  getLast(host: string, name: string, metric: MetricType, options) {
    return this.fetch(host, name, null, metric, 'last', options);
  }

  getSpan(host: string, name: string, metric: MetricType, options) {
    return this.fetch(host, name, null, metric, 'range', options);
  }

  private fetch(host: string, name: string, jobType, ...args) {
    let options = {};
    if (args.length) {
      const last = args[args.length - 1];
      if (isObject(last)) {
        options = last;
        args = args.slice(0, args.length - 1);
      }
    }
    return this._request.get(getUrl(host, name, jobType, ...args), options);
  }
}
