import pMap from 'p-map';
import got from 'got';
import boom from '@hapi/boom';
import { Queue } from 'bullmq';
import { merge, isObject } from 'lodash';
import {
  NotificationContext,
  NotificationInitContext,
  NotificationPlugin,
} from '@src/types';
import schema, { WebhookConfig } from './schema';
import { createDebug } from '../../lib/debug';
import { EVENT_NAMES } from '../utils';
import { packageInfo } from '../../packageInfo';

const debug = createDebug('notifications:webhooks');

// https://en.wikipedia.org/wiki/List_of_HTTP_status_codes
const HTTP_SUCCESS_CODES = [
  200, // OK
  201, // Created
  202, // Accepted
  203, // Non-Authoritative Information (since HTTP/1.1)
  204, // No Content
  205, // Reset Content
  207, // Multi-Status (WebDAV; RFC 4918)
  208, // Already Reported (WebDAV; RFC 5842)
  226, // IM Used (RFC 3229)
];

const functionsByUrl = new Map<string, Function>();

interface WebHook {
  id: string;
  urls: string[];
  options: Record<string, any>;
  handlers: Set<Function>;
  httpSuccessCodes: number[];
}

// todo: have retries, backoffs (use a circuit breaker)
function getRequestFunction(url: string, config: WebhookConfig) {
  return async function (
    context: NotificationContext,
    event: string,
    hook: WebHook,
    data: any,
  ): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, disable, type, ...options } = config;

    const headers = Object.assign(
      {
        'Content-Type': 'application/json',
        'user-agent': `${packageInfo.name}/${packageInfo.version} (${packageInfo.homepage})`,
      },
      config.headers || {},
    );

    debug('POST request to:', url);

    // todo: emit timings as well
    // see https://github.com/sindresorhus/got#timings
    function emit(status, statusCode, body): void {
      const requestMeta = {
        name: event,
        type: status,
        request: {
          url,
          data,
          headers,
        },
        response: {
          statusCode,
          body,
        },
      };
      // todo: log
      debug(`Triggered web hook ${id} %O`, requestMeta);
    }

    function getRequestOptions() {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { urls, httpSuccessCodes, ...opts } = options;
      return merge(
        {
          url,
          headers,
          body: JSON.stringify(data),
          decompress: false,
          isStream: false,
        },
        opts,
      );
    }

    let error, statusCode, body;
    try {
      const requestOptions = getRequestOptions();
      // TODO: Types of property 'isStream' are incompatible.
      //           Type 'boolean' is not assignable to type 'true'.
      // @ts-ignore
      const resp = await got.post(url, requestOptions);
      statusCode = resp.statusCode;
      body = resp.body;
    } catch (e) {
      error = e;
      statusCode = e.code;
      body = e.response.body;
    }

    debug('Request sent - Server responded with:', statusCode, body);

    if (error) {
      const successCodes = options.httpSuccessCodes || HTTP_SUCCESS_CODES;
      if (!successCodes.includes(statusCode)) {
        emit('failure', statusCode, body);
        return debug('HTTP failed: ' + error);
      }
    }

    emit('success', statusCode, body);
  };
}

function parseWebhookSpec(id: string, spec: WebhookConfig): WebHook {
  function parseUrls(spec: any): string[] {
    if (Array.isArray(spec)) {
      return spec;
    } else if (typeof spec === 'string') {
      return [spec];
    }
    throw new TypeError(`url(s) required! Got "${spec}"`);
  }

  const obj: WebHook = {
    id,
    urls: [],
    options: {},
    handlers: new Set(),
    httpSuccessCodes: HTTP_SUCCESS_CODES,
  };

  if (isObject(spec)) {
    const urls = spec['urls'];
    obj.urls = parseUrls(urls);
    obj.options = spec['options'] || Object.create(null);
    obj.httpSuccessCodes = spec['httpSuccessCodes'] || HTTP_SUCCESS_CODES;
  } else {
    obj.urls = parseUrls(spec);
  }
  const dedupe = new Set();
  obj.urls.forEach((url) => {
    if (dedupe.has(url)) {
      throw boom.badImplementation(
        `Duplicate url in web hook ${id} : "${url}"`,
      );
    }
    // todo: validate url
    dedupe.add(url);

    let fn = functionsByUrl.get(url);
    if (!fn) {
      fn = getRequestFunction(url, spec);
      functionsByUrl.set(url, fn);
    }

    obj.handlers.add(fn);
  });

  return obj;
}

function createEventHandler(hook: WebHook, event: string) {
  return async function trigger(
    context: NotificationContext,
    queue: Queue,
    data: any,
  ): Promise<void> {
    await pMap(hook.handlers, (fn) => fn(context, event, hook, data), {
      concurrency: 4,
    });
  };
}

export function init(context: NotificationInitContext, options: any): void {
  const { id } = context;
  const hook = parseWebhookSpec(id, options);
  if (!hook.handlers.size) {
    throw new TypeError('no urls specified for webhook');
  }

  EVENT_NAMES.forEach((event) => {
    context.on(event, createEventHandler(hook, event));
  });
}

export const webhookPlugin: NotificationPlugin = {
  init,
  schema,
};
