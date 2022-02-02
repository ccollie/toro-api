import { capitalize, isString, snakeCase } from '@alpen/shared';
import querystring from 'querystring';

export const escapeURI = (str: string | undefined): string => {
  if (isString(str)) {
    return querystring.escape(str);
  }
  return '';
};

export function humanize(str: string): string {
  const value = snakeCase(str ?? '').replace(/_id$/, '').replace(/_/g, ' ');
  return capitalize(value.trim());
}

