import { parseDuration } from '@alpen/shared';
import { getValue } from '../config';

export function getConfigDuration(key: string, defaultValue?: number): number {
  const lower = key.toLowerCase();
  const baseValue = getValue(lower);
  return baseValue ? parseDuration(baseValue, defaultValue) : defaultValue;
}

export function getConfigNumeric(key: string, defaultValue?: number): number {
  const lower = key.toLowerCase();
  const baseValue = parseInt(getValue(lower), 10);
  return !isNaN(baseValue) ? baseValue : defaultValue;
}
