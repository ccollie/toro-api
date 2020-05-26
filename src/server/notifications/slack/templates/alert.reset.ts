import { Queue } from 'bullmq';
import { NotificationContext } from '@src/types';
import { capitalize, omit } from 'lodash';
import { bold, getQueueUrl, toFields, getContextBlock } from './helpers';

function getFieldsBlock(data) {
  return {
    type: 'section',
    fields: toFields(data),
  };
}

export default function generateMessage(
  context: NotificationContext,
  eventName: string,
  queue: Queue,
  data: any,
) {
  const OMITTED_FIELDS = ['signal', 'ts'];

  const filteredData = omit(data || {}, OMITTED_FIELDS);
  const type = capitalize(eventName.split('-')[0]);

  const blocks: any[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `Alert State Reset on Queue: ${bold(getQueueUrl(queue))}`,
      },
    },
  ];

  if (Object.keys(filteredData).length) {
    const fields = getFieldsBlock(filteredData);
    blocks.push(fields);
  }

  blocks.push(getContextBlock(data.end, context));

  return {
    blocks,
  };
}

module.exports = generateMessage;
