import { isNotNumber } from 'src/lib/assertion';

export function roundTo(n: number, digits: number) {
  if (digits === undefined) {
    digits = 0;
  }

  const multiplicator = Math.pow(10, digits);
  n = parseFloat((n * multiplicator).toFixed(11));
  return Math.round(n) / multiplicator;
}

export function getErrorPercentage(success: number, failed: number, digits = 2): number {
  const total = success + failed;
  return total === 0 ? 0 : roundTo(failed / total, digits) * 100;
}

/**
 * Converts a value to a specific precision (or decimal points).
 *
 * Returns a string representing a number in fixed-point notation.
 *
 * @param value the value to convert
 * @param precision the precision or decimal points
 */
export function toPrecision(value: number, precision?: number): string {
  let nextValue: string | number = toNumber(value);
  const scaleFactor = 10 ** (precision ?? 10);
  nextValue = Math.round(nextValue * scaleFactor) / scaleFactor;
  return precision ? nextValue.toFixed(precision) : nextValue.toString();
}

/**
 * Convert a value to number
 * @param value the value to convert
 */
function toNumber(value: any): number {
  const num = parseFloat(value);
  return isNotNumber(num) ? 0 : num;
}


export const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);
