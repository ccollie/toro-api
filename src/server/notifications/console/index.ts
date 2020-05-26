import { Queue } from 'bullmq';
import {
  NotificationContext,
  NotificationInitContext,
  NotificationPlugin,
} from '@src/types';

import ms from 'ms';
import chalk from 'chalk';
import prettyMs from 'pretty-ms';
import schema from './schema';
import { systemClock } from '../../lib/clock';
import { differenceInMilliseconds } from 'date-fns';

function formatName(service): string {
  return chalk.white(service.name);
}

function formatError(error): string {
  const errorText = JSON.stringify(error);
  return chalk.red(errorText);
}

function error(text): string {
  return chalk.red(text);
}

function warning(text: string): string {
  return chalk.yellow(text);
}

function success(text: string): string {
  return chalk.green(text || 'OK!');
}

function formatTime(time): string {
  return chalk.gray(ms(time));
}

function formatDuration(timestamp): string {
  const diff = differenceInMilliseconds(systemClock.now(), timestamp);
  const duration = prettyMs(diff);
  return chalk.white(duration);
}

/**
 * Helper for alert triggers
 * @param {Object} context
 * @param {Object} queue
 * @param {Object} data
 * @param {number} data.elapsedTime (ms)
 */
function onAlertTriggered(
  context: NotificationContext,
  queue: Queue,
  data: any,
): void {
  const msg = ` ${formatName(queue)}: Alert "${data.name}" raised. `;
  console.log(msg, data);
}

/**
 * Alert has abated
 * @param {Object} context
 * @param {Queue}  queue
 * @param {Object} data
 */
function onAlertReset(
  context: NotificationContext,
  queue: Queue,
  data: any,
): void {
  const queueName = formatName(queue);
  const end = data.end || systemClock.now();
  const timeSpan = formatDuration(end - data.start);
  console.log(` ${queueName}: Alert "${data.name}" reset after ${timeSpan}. `);
  console.log(data);
}

/**
 * Queue error state
 * @param {NotificationContext} context
 * @param {Queue}  queue
 * @param {Object} data
 */
async function onQueueError(
  context: NotificationContext,
  queue: Queue,
  data: any,
) {
  const serviceOkMsg = formatName(queue) + error(' error ');
  console.log(serviceOkMsg, data);
}

/**
 * Error state reset
 * @param {NotificationInitContext} context
 * @param {Queue} queue
 * @param {Object} data
 */
async function onErrorReset(
  context: NotificationContext,
  queue: Queue,
  data: any,
) {
  const serviceMsg = formatName(queue) + ' error reset ' + success('OK!');
  console.log(serviceMsg, data);
}

function init(context: NotificationInitContext, data: any) {
  context.on('alert.triggered', onAlertTriggered);
  context.on('alert.reset', onAlertReset);

  context.on('error', onQueueError);
  context.on('error.reset', onErrorReset);
}

export const consolePlugin: NotificationPlugin = {
  init,
  schema,
};
