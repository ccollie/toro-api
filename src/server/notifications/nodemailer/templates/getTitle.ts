'use strict';
import { Queue } from 'bullmq';
import { capitalize } from 'lodash';
import { getQueueUrl as getUrl } from '../../../lib/urlService';

export function getQueueUrl(queue: Queue): string {
  const url = getUrl(queue);
  return `<a href="${url}">${queue.name}</a>`;
}

function getSpikeResetTitle(eventName: string, queue: Queue): string {
  const type = capitalize(eventName.split('-')[0]);
  return `${type} Returned To Normal Range on Queue: ${getQueueUrl(queue)}`;
}

function getAlertResetTitle(eventName: string, queue: Queue): string {
  return `Alert Reset on Queue: ${getQueueUrl(queue)}`;
}

function getAlertTitle(eventName: string, queue: Queue): string {
  return `Alert Raised on Queue: ${getQueueUrl(queue)}`;
}

function defaultTitleFn(eventName: string, queue: Queue): string {
  return `Event "${eventName}" on Queue: ${getQueueUrl(queue)}`;
}

const TITLE_FUNCTIONS = {
  'latency-spike.reset': getSpikeResetTitle,
  'wait-spike.reset': getSpikeResetTitle,
  'alert.triggered': getAlertTitle,
  'alert.reset': getAlertResetTitle,
};

export default function getTitle(eventName: string, queue: Queue): string {
  const fn = TITLE_FUNCTIONS[eventName] || defaultTitleFn;
  return fn(eventName, queue);
}
