'use strict';
import { Queue } from 'bullmq';
import prettyMs from 'pretty-ms';
import { capitalize } from 'lodash';

/**
 * Helper for spike warnings
 * @param {String} eventName either 'latency.spike' or 'wait-time.spike'
 * @param {Object} data
 * @param {number} data.signal
 * @param {number} data.value value which caused peak
 * @param {number} data.threshold unit associated with peak value
 */
function getSpikeDescription(eventName: string, data: any): string {
  const type = capitalize(eventName.split('-')[0]);
  const { signal, thresholdUnit, threshold } = data;
  const upwards = parseInt(signal) > 0;
  const verb = upwards ? 'exceeded' : 'fell below';
  let formattedValue = `${threshold} ${thresholdUnit}`;
  if (thresholdUnit === 'ms') {
    formattedValue = prettyMs(threshold);
  }
  // ${metric} ${verb} ${threshold} ${thresholdUnit}"
  return `${capitalize(type)} ${verb} ${formattedValue} ${thresholdUnit}. `;
}

function defaultFn(eventName, queue): string {
  return '';
}

const SUBJECT_FUNCTIONS = {
  'alert.triggered': getSpikeDescription,
  'alert.reset': getSpikeDescription,
};

export default function getTitle(eventName: string, queue: Queue): string {
  const fn = SUBJECT_FUNCTIONS[eventName] || defaultFn;
  return fn(eventName, queue);
}
