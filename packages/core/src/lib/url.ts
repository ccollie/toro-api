import { badImplementation } from '@hapi/boom';
import { getValue } from '../config';
import querystring from 'querystring';
import { interpolate, isEmpty } from '@alpen/shared';

function getUri(name: string, data: Record<string, any>, options = {}): string {
  const envVar = `${name.toUpperCase()}_URI_TEMPLATE`;
  let template = process.env[envVar];
  if (!template) {
    const templates = getValue('uriTemplates');
    template = templates?.[name];
  }
  if (template) {
    let url = interpolate(template, data);
    if (!isEmpty(options)) {
      url = url + querystring.stringify(options);
    }
    return url;
  }
  throw badImplementation(`missing ${name} uri template config`);
}

export function getQueueUri(queue: Record<string, any>, options = {}): string {
  return getUri('queue', { queue }, options);
}

export function getSiteUrl(): string {
  const server = getValue('server') || { host: 'localhost', port: 80 };
  let result = server.host;
  if (server.port) {
    result = `${result}:${server.port}`;
  }
  return result;
}

export function getHostUri(host: Record<string, any>, options = {}): string {
  return getUri('host', { host }, options);
}
