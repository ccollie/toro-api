'use strict';
import { Queue } from 'bullmq';
import { capitalize } from 'lodash';

function getQueueUrl(queue: Queue): string {
  return `${queue.name}`;
}

function getErrorResetTitle(eventName: string, queue: Queue): string {
  const type = capitalize(eventName.split('-')[0]);
  return `${type} Returned To Normal Range on Queue: ${getQueueUrl(queue)}`;
}

function getErrorTitle(eventName: string, queue: Queue): string {
  return `Failure Detected on Queue: ${getQueueUrl(queue)}`;
}

function getAlertTitle(eventName: string, queue: Queue): string {
  const type = capitalize(eventName.split('-')[0]);
  return `${type} on Queue: ${getQueueUrl(queue)}`;
}

function getAlertResetTitle(eventName: string, queue: Queue): string {
  return `Alert condition reset on Queue: ${getQueueUrl(queue)}`;
}

function defaultTitleFn(eventName: string, queue: Queue): string {
  return `Event "${eventName}" on Queue: ${getQueueUrl(queue)}`;
}

const SUBJECT_FUNCTIONS = {
  'alert.triggered': getAlertTitle,
  'alert.reset': getAlertResetTitle,
  error: getErrorTitle,
  'error.reset': getErrorResetTitle,
};

export default function getTitle(eventName: string, queue: Queue): string {
  const fn = SUBJECT_FUNCTIONS[eventName] || defaultTitleFn;
  return fn(eventName, queue);
}
