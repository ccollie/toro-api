import { random } from '@alpen/shared';
import { createJobEvent } from '../../__tests__/factories';
import { BaseMetric, Events } from '../';
import { QueueBasedMetric } from '../../metrics';
import { getStaticProp } from '@alpen/shared';

function getKey(metric: BaseMetric): string {
  return getStaticProp(metric, 'key');
}

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

export function validateEmptyJobNamesFilter(instance: QueueBasedMetric): void {
  const event = createJobEvent(Events.FAILED);
  expect(instance.accept(event)).toBeTruthy();
}

export function validateJobNamesFilter(instance: QueueBasedMetric): void {
  const validJobNames = ['valid', 'job', 'name'];

  instance.jobNames = validJobNames;
  expect(instance.jobNames).toStrictEqual(validJobNames);

  const validateName = (name: string, shouldAccept: boolean) => {
    const event = createJobEvent(Events.COMPLETED, {
      job: {
        name,
      },
    });
    expect(instance.accept(event)).toBe(shouldAccept);
  };

  validJobNames.forEach((name) => validateName(name, true));

  ['stupendous', 'fungal', 'tiddly-bop'].forEach((name) =>
    validateName(name, false),
  );
}

export function validateMetricToJSON(metric: BaseMetric): void {
  const key = getKey(metric);
  const json = metric.toJSON();

  const aggregator = metric.aggregator.toJSON();
  // hack: options is protected
  const options = (metric as any).options;
  expect(json).toBeDefined();
  expect(json.type).toBe(key);
  expect(json).toMatchObject({
    id: metric.id,
    createdAt: metric.createdAt,
    updatedAt: metric.createdAt,
    name: metric.name,
    description: metric.description,
    isActive: metric.isActive,
    options,
    aggregator,
  });
}
