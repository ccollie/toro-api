import { MetricValueType } from '@alpen/core';
import { createEnumFromTS } from './types';

export const MetricValueTypeTC = createEnumFromTS(
  MetricValueType,
  'MetricValueType',
);
