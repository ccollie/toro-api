import got, { Got } from 'got';
import boom from '@hapi/boom';
import { createDebug, logger, validateUrl } from './index';
import { packageInfo } from '../packageInfo';
import { URLSearchParams } from 'url';
import isEmpty from 'lodash/isEmpty';
import { compile, MapperDelegate } from './object-mapper';

const debug = createDebug('http-client');

// https://en.wikipedia.org/wiki/List_of_HTTP_status_codes
const HTTP_SUCCESS_CODES = [
  200, // OK
  201, // Created
  202, // Accepted
  203, // Non-Authoritative Information (since HTTP/1.1)
  204, // No Content
  205, // Reset Content
  206, // Partial Content
];

/** General configuration options for http client */
export interface HttpClientConfig {
  /** Url to post data to */
  url: string;
  /** The http method to use */
  method?: 'get' | 'GET' | 'post' | 'POST';
  /** Request headers.*/
  headers?: Record<string, any>;
  /** Response type ("text", "json") .*/
  responseType: 'text' | 'json';
  /** Milliseconds to wait for the server to end the response before aborting the client.
   * TimeoutError error (a.k.a. client property). By default, there's no timeout. */
  timeout?: number;
  /** The number of times to retry the client */
  retry?: number;
  /** Defines if redirect responses should be followed automatically. */
  followRedirect?: boolean;
  /**
   * Set this to true to allow sending body for the GET method.
   * This option is only meant to interact with non-compliant servers when you have no other choice.
   * */
  allowGetBody?: boolean;
  /** Optional success http status codes. Defaults to 200 - 206 */
  httpSuccessCodes?: number[];
  /** Optional payload to include with the hook */
  payload?: Record<string, any>;
  /** Optional output mapper */
  resultMap?: Record<string, any>;
}

const ConfigDefaults: Partial<HttpClientConfig> = {
  method: 'POST',
  responseType: 'text',
};

export function createHttpRequester(config: HttpClientConfig): Got {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { url, httpSuccessCodes, ...options } = config;
  const { homepage } = packageInfo;

  const agent =
    `${packageInfo.name}/${packageInfo.version}` +
    (homepage ? ` (${homepage})` : '');

  const headers = Object.assign(
    {
      'user-agent': agent,
    },
    config.headers || {},
  );
  const opts = {
    url,
    headers,
    decompress: false,
    isStream: false,
    ...ConfigDefaults,
    ...options,
  };

  return got.extend(opts);
}

export type HttpClientResult = {
  statusCode: number;
  body: string | Record<string, any>;
};

const NullMapper: MapperDelegate = (data) => data;

export class HttpClient {
  private client: Got;
  protected opts: HttpClientConfig;
  private mapper: MapperDelegate = NullMapper;

  constructor(options: HttpClientConfig) {
    this.opts = { ...ConfigDefaults, ...options };
    if (!validateUrl(options.url)) {
      throw boom.badRequest('Url invalid or missing');
    }
    this.client = createHttpRequester(options);
    if (options.resultMap) {
      this.mapper = compile(options.resultMap);
    }
  }

  public get url(): string {
    return this.opts.url;
  }

  public update(config: Partial<HttpClientConfig>): void {
    const options = Object.assign({}, this.opts, config);
    if (!validateUrl(options.url)) {
      throw boom.badRequest('Url invalid or missing');
    }
    this.opts = options;
    this.client = createHttpRequester(this.opts);
    this.mapper = isEmpty(options.resultMap)
      ? NullMapper
      : compile(options.resultMap);
  }

  protected constructPayload(data: Record<string, any>): Record<string, any> {
    const { method, allowGetBody } = this.opts;
    const payload = this.opts.payload || {};
    const fullData = this.mapper({
      ...data,
      ...payload,
    });
    if (isEmpty(fullData)) {
      return fullData;
    }
    if (method.toUpperCase() === 'GET') {
      if (!!allowGetBody) {
        return {
          body: fullData,
        };
      }
      const dataParams = new URLSearchParams(data);
      return { searchParams: dataParams };
    }
    // todo: allow post as form
    return {
      json: fullData,
    };
  }

  private isSuccessful(statusCode: number): boolean {
    const successCodes = this.opts.httpSuccessCodes || HTTP_SUCCESS_CODES;
    return successCodes.includes(statusCode);
  }

  async fetch(data: Record<string, any>): Promise<HttpClientResult> {
    const config = this.opts;
    debug(`${config.method} request to: "%s"`, config.url);

    // todo: emit timings as well
    // see https://github.com/sindresorhus/got#timings
    function emit(status, statusCode: number, body): void {
      const requestMeta = {
        type: status,
        request: {
          url: config.url,
          data,
          //headers,
        },
        response: {
          statusCode,
          body,
        },
      };
      // todo: log
      debug(`Triggered web hook "${config.url}" %O`, requestMeta);
    }

    let error, statusCode, body;
    try {
      const payload = this.constructPayload(data);
      const response = await this.client(payload);
      statusCode = response.statusCode;
      try {
        body = response.body;
      } catch (e) {
        logger.warn(e);
        if (this.isSuccessful(statusCode)) {
          body = '';
        }
      }
    } catch (e) {
      logger.warn(e);
      error = e;
      statusCode = e.code;
      body = e.response?.body || e.response?.message;
    }

    debug('Request sent - Server responded with:', statusCode, body);

    if (error) {
      if (!this.isSuccessful(statusCode)) {
        emit('failure', statusCode, body);
        return debug('HTTP FAILED: ' + error);
      }
    }

    emit('success', statusCode, body);

    return { statusCode, body };
  }
}
