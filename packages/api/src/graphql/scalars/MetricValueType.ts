import { MetricValueType } from '@alpen/core/metrics';
import { createEnumFromTS } from './types';

export const MetricValueTypeTC = createEnumFromTS(
  MetricValueType,
  'MetricValueType',
);
