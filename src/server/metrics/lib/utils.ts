//import { Predicate } from 'index';
import { isString } from 'lodash';
import * as units from './units';
import ms from 'ms';
import { Predicate } from '@src/types';

export function calculateInterval(duration: number): number {
  const asString = ms(duration, { long: true });
  const [, unit] = asString.split(' ');

  switch (unit) {
    case 'millisecond':
    case 'milliseconds':
      return units.MILLISECONDS;
    case 'second':
    case 'seconds':
      return 100 * units.MILLISECONDS;
    case 'minute':
    case 'minutes':
      return 5 * units.SECONDS;
    case 'hour':
    case 'hours':
      return 30 * units.SECONDS;
    case 'day':
    case 'days':
      return 15 * units.MINUTES;
    case 'month':
    case 'months':
      return units.HOURS;
  }

  return units.SECONDS;
}

export function createJobNameFilter(
  jobNames?: string | string[],
): Predicate<string> {
  if (!jobNames) {
    return () => true;
  } else if (isString(jobNames)) {
    return (name: string) => name === jobNames;
  } else if (jobNames.length === 1) {
    return (name: string) => name === jobNames[0];
  }
  return (name: string) => !!name && jobNames.includes(name);
}

export function GCF(a: number, b: number): number {
  return b === 0 ? a : GCF(b, a % b);
}

export function GCFOfList(list: number[]): number {
  let result = list[0];
  for (let n = 1; n < list.length; n++) {
    result = GCF(result, list[n]);
    if (result == 1) {
      break;
    }
  }
  return result;
}
