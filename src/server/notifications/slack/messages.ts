import { getTitle } from '../utils';
import { NotificationContext, RuleEventsEnum } from '../../../types';
import { isEmpty } from 'lodash';
import {
  getObjectFieldsBlock,
  getTextBlock,
  getMarkdownText,
  markdownToSlack,
  formatFieldName,
  getDateField,
  getMultilineTextBlock,
  getFieldsBlock,
} from './msg-builder';
import {
  Block,
  BlockType,
  ContextBlock,
  Field,
  TextBlock,
} from './slack.types';
import { DateLike } from '../../lib/datetime';
import toDate from 'date-fns/toDate';
import { systemClock } from '../../lib';

export const getUnixTimestamp = (date: DateLike) =>
  Math.round(toDate(date).getTime() / 1000);

export const getContextBlock = (
  ts: DateLike,
  context: NotificationContext,
): ContextBlock => {
  const createdTs = getUnixTimestamp(ts);
  const { env, app } = context;

  const timestamp = `*Timestamp: *<!date^${createdTs}^{date_num} {time_secs}| >`;
  // todo: version
  return {
    type: BlockType.context,
    elements: [
      getMarkdownText(timestamp),
      getMarkdownText(`*Env: *${env}`),
      getMarkdownText(`*site: *${app.title}`),
    ],
  };
};

function addDateTimeField(
  fields: Field[],
  name: string,
  value: DateLike | undefined,
): void {
  if (value === undefined) return;
  const fieldName = formatFieldName(name);
  const field = getDateField(fieldName, value);
  fields.push(field);
}

function getMessageBlock(message: string): TextBlock {
  const md = markdownToSlack(message || '');
  return getMultilineTextBlock(md);
}

export function defaultHandler(
  context: NotificationContext,
  eventName: string,
  data: Record<string, any>,
): Block[] {
  // temp
  const message = data.message || '';
  const blocks: Block[] = [];
  if (message) {
    blocks.push(getMessageBlock(message));
  }
  const dataObject = data['data'];
  if (!isEmpty(dataObject)) {
    blocks.push(getObjectFieldsBlock(dataObject));
  }
  blocks.push(getContextBlock(systemClock.getTime(), context));

  return blocks;
}

function filterAlertData(data: Record<string, any>): Record<string, any> {
  return data;
}

function createAlertFields(data: Record<string, any>): Block {
  const fields: Field[] = [];

  function addField(name: string): void {
    const value = data[name];
    if (value === undefined) return;
    const fieldName = formatFieldName(name);
    fields.push({
      name: fieldName,
      value,
    });
  }

  // todo: filter data
  addDateTimeField(fields, 'start', data['start']);
  addDateTimeField(fields, 'end', data['end']);
  addField('threshold');
  addField('value');
  addField('violations');
  addField('alerts');

  return getFieldsBlock(fields);
}

function handleAlert(
  context: NotificationContext,
  eventName: string,
  data: Record<string, any>,
): Block[] {
  const blocks: Block[] = [];

  // todo: ${errorLevel}: rule violated on host/queue:
  const rule = data['rule'];
  if (rule && rule.name) {
    const ruleText = `**Rule**: ${rule.name}`;
    const block = getTextBlock(ruleText);
    blocks.push(block);
  }
  blocks.push(createAlertFields(data));

  const filteredData = filterAlertData(data);

  const base = defaultHandler(context, eventName, filteredData);
  blocks.push(...base);

  return blocks;
}

function handleReset(
  context: NotificationContext,
  eventName: string,
  data: Record<string, any>,
): Block[] {
  return defaultHandler(context, eventName, data);
}

const handlers = {
  [RuleEventsEnum.ALERT_TRIGGERED]: handleAlert,
  [RuleEventsEnum.ALERT_RESET]: handleReset,
  default: defaultHandler,
};

export function getMessage(
  context: NotificationContext,
  event: string,
  data: Record<string, any>,
) {
  const text = markdownToSlack(getTitle(event, context, data));
  const fn = handlers[event] || defaultHandler;
  const blocks = fn(context, event, data);
  return {
    text,
    blocks,
  };
}
