import boom from '@hapi/boom';
import config from '../config';
import querystring from 'querystring';
import { isEmpty } from 'lodash';
import { Queue } from 'bullmq';
import { interpolate } from './utils';

export function getQueueUrl(queue: Queue, options = {}): string {
  const urlTemplate = config.getValue('queueUrlTemplate');
  if (!urlTemplate) {
    throw boom.badImplementation('config value missing for "queueUrlTemplate"');
  }
  let url = interpolate(urlTemplate, queue);
  if (!isEmpty(options)) {
    url = url + querystring.stringify(options);
  }
  return url;
}

export function getSiteUrl(): string {
  const server = config.getValue('server') || { host: 'localhost', port: 80 };
  let result = server.host;
  if (server.port) {
    result = `${result}:${server.port}`;
  }
  return result;
}
