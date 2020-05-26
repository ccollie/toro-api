import querystring from 'querystring';
import prettyMs from 'pretty-ms';
import { isNumber } from '../lib/utils';
import { systemClock } from '../lib/clock';
import { trim, snakeCase, capitalize, isString } from 'lodash';

// todo: queue paused, queued resumed, queue deleted
export const EVENT_NAMES = [
  'alert.triggered',
  'alert.reset',
  'error',
  'error.reset',
];

export const EVENT_DESCRIPTIONS = {
  'alert.triggered': 'Alert Triggered',
  'alert.reset': 'Alert Reset',
  error: 'Error',
  'error.reset': 'Error Reset',
};

export const toFixed = (number, digits) => {
  if (!isNumber(number)) {
    number = 0;
  }
  if (!isNumber(digits)) {
    digits = 0;
  }
  return Number(number).toFixed(digits);
};

export const duration = (timestamp): string => {
  return prettyMs(systemClock.now() - timestamp);
};

export const escapeURI = (str): string => {
  if (isString(str)) {
    return querystring.escape(str);
  }
  return '';
};

export const urlEncode = (str: string) => {
  if (isString(str)) {
    return encodeURIComponent(str);
  }
  return '';
};

export function humanize(str: string): string {
  return capitalize(
    trim(snakeCase(str).replace(/_id$/, '').replace(/_/g, ' ')),
  );
}
