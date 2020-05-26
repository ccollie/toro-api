import { Queue } from 'bullmq';
import { getQueueUrl as getUrl, titleCase } from '../../../lib';
import { isObject, flatten, trim, snakeCase, capitalize, map } from 'lodash';

import { NotificationContext } from '@src/types';

export function humanize(str: string): string {
  return capitalize(
    trim(snakeCase(str).replace(/_id$/, '').replace(/_/g, ' ')),
  );
}

/**
 * @param {string} txt
 * @returns {string}
 */
export function bold(txt: string): string {
  return `*${txt}*`;
}

/**
 * @param {string} txt
 * @returns {string}
 */
export function italicize(txt: string): string {
  return `_${txt}_`;
}

/**
 * @param {string} txt
 * @returns {string}
 */
export function pre(txt: string): string {
  return `\`${txt}\``;
}

/**
 * @see https://api.slack.com/docs/message-formatting#how_to_escape_characters
 * @param {string} text
 */
export function escapeText(text: string): string {
  return text.replace(/([&<>])/g, (match, g1) => {
    switch (g1) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      default:
        return g1;
    }
  });
}

/**
 * @param {string} url
 * @param {string} text
 */
export function formatUrl(url: string, text: string): string {
  return `<${url}|${text}>`;
}

export const getUnixTimestamp = (date) => Math.round(date.getTime() / 1000);

/**
 * @description Returns Slack-friendly "fields" from arbitrary JavaScript objects
 * @param  {Object} inputObj
 * @param  {string} prefix? - Prepends things to the output. Mostly used inside the function.
 * @returns {Object} fields - a Slack-ready set of "fields"
 */
export function toFields(inputObj: any, prefix: string = null): any[] {
  prefix = prefix ? prefix + '_' : '';
  if (Array.isArray(inputObj) && inputObj.length === 1) {
    inputObj = inputObj[0];
  }

  const result = map(inputObj, (key) => {
    const value = inputObj[key];
    if (isObject(value)) {
      return toFields(value, prefix + key);
    } else {
      return {
        type: 'mrkdwn',
        text: `${bold(titleCase(humanize(prefix + key)))}\n${value}`,
      };
    }
  });

  return flatten(result);
}

export function getQueueUrl(queue: Queue): string {
  return `<${getUrl(queue)} | ${queue.name}>`;
}

export const getContextBlock = (ts, context: NotificationContext) => {
  const createdTs = getUnixTimestamp(new Date(ts));
  const { env, appInfo } = context;

  // todo: version
  return {
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `*Timestamp: *<!date^${createdTs}^{date_num} {time_secs}| >`,
      },
      {
        type: 'mrkdwn',
        text: `*Env: *${env}`,
      },
      {
        type: 'mrkdwn',
        text: `*Site: *${appInfo.title}*`,
      },
    ],
  };
};
