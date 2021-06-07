import {
  Text,
  TextType,
  TextBlock,
  BlockType,
  FieldsBlock,
  Field,
  ContextBlock,
  Block,
} from './slack.types';
import { DateLike } from '@lib/datetime';
import toDate from 'date-fns/toDate';
import { humanize, titleCase } from '../utils';
import { flatten, map, isObject } from 'lodash';
import slackifyMarkdown from 'slackify-markdown';

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
export function parseToMultilineString(text: string): string {
  return '```' + text + '```';
}

export function getMarkdownText(text: string): Text {
  return {
    type: TextType.mrkdwn,
    text: text,
  };
}

export function getTextBlock(text: string): TextBlock {
  return {
    type: BlockType.section,
    text: getMarkdownText(text),
  };
}

export function getMultilineTextBlock(text: string): TextBlock {
  return {
    type: BlockType.section,
    text: getMarkdownText(parseToMultilineString(text)),
  };
}

export function formatFieldName(name: string): string {
  return titleCase(humanize(name));
}

export function getFieldMarkdownText(field: Field): Text {
  const fieldString = `*${field.name}*\n${field.value}`;
  return getMarkdownText(fieldString);
}

export function getFieldsBlock(fields: Field[]): FieldsBlock {
  return {
    type: BlockType.section,
    fields: fields.map(getFieldMarkdownText),
  };
}

/**
 * @description Returns Slack-friendly "fields" from arbitrary JavaScript objects
 * @param  {Object} inputObj
 * @param  {string} prefix? - Prepends things to the output. Mostly used inside the function.
 * @returns {Object} fields - a Slack-ready set of "fields"
 */
export function toFields(inputObj: any, prefix: string = null): Field[] {
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
        name: formatFieldName(prefix + key),
        value: value,
      };
    }
  });

  return flatten(result);
}

export function getObjectFieldsBlock(obj: any, prefix?: string): FieldsBlock {
  const fields = toFields(obj, prefix);
  return getFieldsBlock(fields);
}

export function getContextBlock(elements: string[]): ContextBlock {
  return {
    type: BlockType.context,
    elements: elements.map(getMarkdownText),
  };
}

export function getDividerBlock(): Block {
  return {
    type: BlockType.divider,
  };
}

export function getDateTime(dt: DateLike): string {
  const converted = toDate(dt);
  const dtUnix = Math.floor(converted.valueOf() / 1000);
  return `<!date^${dtUnix}^{date} at {time}|${converted.toISOString()}>`;
}

export function getDateField(name: string, dt: DateLike): Field {
  return {
    name,
    value: getDateTime(dt),
  };
}

export function parseToErrorTitleString(
  customErrMsg: string,
  err: Error,
): string {
  let errTitle = ':rotating_light:';

  if (customErrMsg) {
    errTitle += ` *${customErrMsg}*`;
  }

  if (err && err.message) {
    if (customErrMsg) {
      errTitle += `\nError: ${err.message}`;
    } else {
      errTitle += ` *Error: ${err.message}*`;
    }
  }

  return errTitle;
}

export function linkify(text: string, url: string): string {
  return `<${url}|${text}>`;
}

export function markdownToSlack(markdown: string): string {
  return markdown ? slackifyMarkdown(markdown) : '';
}
