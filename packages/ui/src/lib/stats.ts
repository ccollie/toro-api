import { getErrorPercentage } from './math';
import { StatsSnapshot } from '../types';

export function calcJobRatePerUnit(
  data: StatsSnapshot,
  unit: 'minute' | 'second',
): number {
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);
  const windowSize = end.getTime() - start.getTime() + 1;
  const divisor = 1000 * (unit === 'minute' ? 60 : 1);
  const result = data.count / (windowSize / divisor);
  return (result * 100) / 100;
}

export function calcErrorPercentage(data: StatsSnapshot): number {
  const { completed, failed } = data;
  return getErrorPercentage(completed, failed, 1);
}
