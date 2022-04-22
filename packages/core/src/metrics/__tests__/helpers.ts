import { random } from '@alpen/shared';
import { Metric } from '../';

export function getRandomBoolArray(count?: number): boolean[] {
  count = count || random(5, 20);
  const result = new Array(count);
  for (let i = 0; i < count; i++) {
    result[i] = random(1, 10) % 2 === 0;
  }
  return result;
}

export function getRandomNumberArray(length?: number): number[] {
  length = length || random(5, 20);
  const xs = new Array<number>(length);
  for (let i = 0; i < xs.length; ++i) {
    xs[i] = Math.random();
  }
  return xs;
}

export function validateMetricToJSON(metric: Metric): void {
  const json = metric.toJSON();
  // hack: options is protected
  const options = (metric as any).options;
  expect(json).toBeDefined();
  expect(json).toMatchObject({
    id: metric.id,
    createdAt: metric.createdAt,
    updatedAt: metric.createdAt,
    name: metric.name,
    isActive: metric.isActive,
    options,
  });
}
