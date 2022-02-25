import { isBoolean } from '@/lib/assertion';
import { isValidDate, parseDateMath } from '@alpen/shared';

export function parseRelativeDate(date: string, roundup?: boolean): number {
  const opts = {
    roundUp: isBoolean(roundup) ? roundup : false,
  };
  if (isBoolean(roundup)) opts['roundUp'] = roundup;
  const start = parseDateMath(date, opts);
  // dateMath.parse is inconsistent with unparsable strings.
  // Sometimes undefined is returned, other times an invalid moment is returned
  if (!start || !isValidDate(start)) {
    throw new TypeError('Unable to parse start string');
  }
  return start.valueOf();
}
