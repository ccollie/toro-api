import { joinPath } from './common/utils';
import { JobService } from './services/jobs';
import { MetricsService } from './services/metrics';
import { QueueService } from './services/queues';
import { RedisService } from './services/redis';
import Request from './services/request';
import { ScheduledJobsService } from './services/scheduled-jobs';
import { WorkerService } from './services/workers';
import { QueueClient } from './queue/queue-client';
import utils from './services/utils';
import { RuleService } from './services/rules';

export interface ClientOptions {
  host?: string;
  hostname?: string;
  port?: number;
  secure?: boolean;
  apiBasePath?: string;
  batchOnHandshake?: boolean;
}

const SECURE_PORT = 443;
const DEFAULT_PORT = 80;

// @ts-ignore
const _location = global.location && location;
const defaultHostname: string =
  (_location && _location.hostname) || 'localhost';

function isSecureDefault() {
  return _location && _location.protocol === 'https:';
}

function getPort(options: ClientOptions | undefined) {
  const isSecure =
    !options || options.secure == null ? isSecureDefault() : options.secure;
  return (
    (options && options.port) ||
    (_location && _location.port
      ? _location.port
      : isSecure
      ? SECURE_PORT
      : DEFAULT_PORT)
  );
}

export class Toro {
  readonly jobs: JobService;
  readonly metrics: MetricsService;
  readonly queues: QueueService;
  readonly request: Request;
  readonly redis: RedisService;
  readonly scheduledJobs: ScheduledJobsService;
  readonly workers: WorkerService;
  readonly rules: RuleService;
  readonly utils: any;

  constructor(config) {
    const { host, requestBasePath } = this.normalizeOptions(config);
    const opts: ClientOptions = {
      host,
      batchOnHandshake: true,
    };

    const request = (this.request = new Request({ requestBasePath }));

    this.jobs = new JobService(request);
    this.metrics = new MetricsService(request);
    this.queues = new QueueService(request);
    this.redis = new RedisService(request);
    this.scheduledJobs = new ScheduledJobsService(request);
    this.workers = new WorkerService(request);
    this.rules = new RuleService(request);
    this.utils = utils;
  }

  public getInfo() {
    return this.request.get('/info');
  }

  getQueueClient(host: string, name: string): QueueClient {
    return new QueueClient(
      this.queues,
      this.jobs,
      this.scheduledJobs,
      this.workers,
      this.metrics,
      host,
      name,
    );
  }

  private normalizeOptions(opts?: ClientOptions | undefined) {
    let _host = opts && opts.host;
    const _hostname = opts && opts.hostname;
    const _port = opts && opts.port;
    const _apiBasePath = (opts && opts.apiBasePath) || '/api';
    let port = getPort(opts);

    const raiseError = () => {
      throw new Error(
        'The host option should already include' +
          ' the hostname and the port number in the format "hostname:port"' +
          ' - Because of this, you should never use host and port options together',
      );
    };

    if (_host) {
      const captures = _host.match(/[^:]+:(\d{2,5})/);
      port = captures.length > 1 ? captures[1] : null;
      if (!port) {
        raiseError();
      }
      if (!!_hostname) {
        raiseError();
      }
      if (_port) {
        raiseError();
      }
    } else if (_hostname) {
      _host = `${_hostname}:${port}`;
    } else {
      _host = `${defaultHostname}:${port}`;
    }

    let requestBasePath = joinPath(_host, _apiBasePath);
    const p = _host.indexOf('://');
    // See if no protocol specified. If not add. needed for Request/cors
    if (p < 1) {
      const protocol = port === SECURE_PORT ? 'https' : 'http';
      requestBasePath = `${protocol}://${requestBasePath}`;
    }
    return { host: _host, port, requestBasePath };
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  destroy() {

  }
}
