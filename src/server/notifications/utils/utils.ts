import querystring from 'querystring';
import { isNumber } from '../../lib/utils';
import {
  trim,
  snakeCase,
  capitalize,
  isString,
  toLower,
  startCase,
} from 'lodash';

export const toFixed = (number, digits?: number): string => {
  if (!isNumber(number)) {
    number = 0;
  }
  if (!isNumber(digits)) {
    digits = 0;
  }
  return Number(number).toFixed(digits);
};

export const escapeURI = (str: string | undefined): string => {
  if (isString(str)) {
    return querystring.escape(str);
  }
  return '';
};

export function humanize(str: string): string {
  return capitalize(
    trim(snakeCase(str).replace(/_id$/, '').replace(/_/g, ' ')),
  );
}

export const titleCase = (str: string): string => startCase(toLower(str));
