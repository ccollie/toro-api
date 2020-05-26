import { Queue } from 'bullmq';
import { capitalize } from 'lodash';
import prettyMs from 'pretty-ms';
import {
  bold,
  italicize,
  getQueueUrl,
  toFields,
  getContextBlock,
} from './helpers';
import { NotificationContext } from '@src/types';

function getFieldsBlock(data: any) {
  return {
    type: 'section',
    fields: toFields(data),
  };
}

/**
 * Helper for alert trigger
 * @param {String} type either 'triggered' or 'reset'
 * @param {Object} data
 * @param {number} data.signal (ms)
 * @param {number} data.value value which caused peak
 * @param {number} data.threshold unit associated with peak value
 */
function formatAlert(type, data: any) {
  const { signal, thresholdUnit, threshold } = data;
  const upwards = parseInt(signal) > 0;
  const verb = upwards ? 'exceeded' : 'fell below';
  let formattedValue = `${threshold} ${thresholdUnit}`;
  if (thresholdUnit === 'ms') {
    formattedValue = prettyMs(threshold);
  }
  // ${metric} ${verb} ${threshold} ${thresholdUnit}"
  return `${capitalize(type)} ${verb} ${formattedValue} ${italicize(
    thresholdUnit,
  )}. `;
}

export default function generateMessage(
  context: NotificationContext,
  eventName: string,
  queue: Queue,
  data: any,
) {
  const { start, ...filteredData } = data;
  const type = eventName.split('-')[1];

  return {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Alert ${capitalize(type)} on Queue: ${bold(
            getQueueUrl(queue),
          )}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: formatAlert(type, data),
        },
      },
      getFieldsBlock(filteredData),
      getContextBlock(start, context),
    ],
  };
}
