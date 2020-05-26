import { Queue } from 'bullmq';
import {
  NotificationContext,
  NotificationInitContext,
  NotificationPlugin,
  SlackNotifierConfig,
} from '@src/types';

import schema from './schema';
import logger from '../../lib/logger';
import { EVENT_NAMES } from '../utils';
import request from '../../lib/request';
import { isFunction } from 'lodash';
import templates from './templates';
import { createDebug } from '../../lib/debug';

const POST_MESSAGE_URL = 'https://slack.com/api/chat.postMessage';

const debug = createDebug('notifications:slack');

function getTemplate(event: string) {
  return templates[event] || templates['default'];
}

function getMessage(
  context: NotificationContext,
  event: string,
  queue: Queue,
  data: any,
) {
  const template = getTemplate(event);
  return isFunction(template) ? template(context, event, queue, data) : null;
}

async function postMessage(message: any, opts: SlackNotifierConfig) {
  const headers = {
    'Content-type': 'application/json',
  };

  let url = opts.webhook;
  const { token } = opts;
  if (token) {
    url = POST_MESSAGE_URL;
    headers['Authorization'] = `Bearer ${token}`;
  }

  let body, statusCode;
  try {
    const resp = await request(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(message),
    });
    statusCode = resp.statusCode;
    body = resp.body;
  } catch (e) {
    statusCode = e.code;
    body = e.response.body;
    logger.error(message, statusCode, body, e.message);
  }

  debug('Request sent - Server responded with:', statusCode, body);
}

function init(
  ctx: NotificationInitContext,
  options: SlackNotifierConfig,
): void {
  function handleEvent(eventName: string) {
    return function (
      context: NotificationContext,
      queue: Queue,
      message: any,
    ): any {
      const slackMessage = getMessage(context, eventName, queue, message);
      console.log(eventName, slackMessage);
      return postMessage(slackMessage, options);
    };
  }

  EVENT_NAMES.forEach((name) => {
    ctx.on(name, handleEvent(name));
  });
}

export const slackPlugin: NotificationPlugin = {
  init,
  schema
};
