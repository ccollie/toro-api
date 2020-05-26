import { Queue } from 'bullmq';
import { omit } from 'lodash';
import { NotificationContext } from '@src/types';
import { bold, getQueueUrl, toFields, getContextBlock } from './helpers';
import { EVENT_DESCRIPTIONS } from '../../utils';

function getFieldsBlock(data) {
  return {
    type: 'section',
    fields: toFields(data),
  };
}

export default function generateMessage(
  context: NotificationContext,
  event: string,
  queue: Queue,
  data: any,
) {
  const OMITTED_FIELDS = ['msg', 'ts'];

  const filteredData = omit(data, OMITTED_FIELDS);

  const description = EVENT_DESCRIPTIONS[event];

  return {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${description} on Queue: ${bold(getQueueUrl(queue))}`,
        },
      },
      getFieldsBlock(filteredData),
      getContextBlock(data.start, context),
    ],
  };
}
