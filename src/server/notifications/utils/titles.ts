'use strict';
import { getQueueUri, linkify } from '../../lib';
import { ErrorLevel, NotificationContext } from '../../../types';

export function getHostUrl(host: Record<string, any>): string {
  const { uri, name = 'host' } = host || {};
  return linkify(uri, name);
}

export function getQueueUrl(
  queue: Record<string, any>,
  includeHost = true,
): string {
  const { uri: queueUri, name: queueName } = queue['uri'] || {};
  let hostMd = '';
  let queueMd = '';
  if (includeHost) {
    const { uri: hostUri, name: hostName = 'host' } = queue['host'] || {};
    if (hostUri) {
      hostMd = linkify(hostUri, hostName);
    } else if (hostName) {
      hostMd = hostName;
    }
  }
  let uri = queueUri;
  if (!uri) {
    uri = getQueueUri(queue);
  }
  if (uri) {
    queueMd = linkify(uri, queueName);
  } else {
    queueMd = queueName;
  }

  return (hostMd ? `${hostMd} / ` : '') + queueMd;
}

function getAlertResetTitle(
  eventName: string,
  context: NotificationContext,
  data: Record<string, any>,
): string {
  const queue = data['queue'];
  const link = getQueueUri(queue);
  return `Alert Reset on Queue: ${link}`;
}

function getAlertTitle(
  eventName: string,
  context: NotificationContext,
  data: Record<string, any>,
): string {
  const queue = data['queue'];
  const errorLevel = data['errorLevel'] ?? ErrorLevel.CRITICAL;
  const link = getQueueUri(queue);
  return `Alert Raised on Queue: ${link}`;
}

function defaultTitleFn(
  eventName: string,
  context: NotificationContext,
  data: Record<string, any>,
): string {
  const queue = data['queue'];
  if (queue) {
    const link = getQueueUri(queue);
    return `Event *"${eventName}"* on queue: ${link}`;
  }
  const hostUrl = getHostUrl(data['host']);
  if (hostUrl) {
    return `Event "${eventName}" on host: ${hostUrl}`;
  }
  return `Event "${eventName}" raised`;
}

const TITLE_FUNCTIONS = {
  'alert.triggered': getAlertTitle,
  'alert.reset': getAlertResetTitle,
};

export function getTitle(
  eventName: string,
  context: NotificationContext,
  data: Record<string, any>,
): string {
  const fn = TITLE_FUNCTIONS[eventName] || defaultTitleFn;
  return fn(eventName, context, data);
}
