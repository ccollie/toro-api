import { MetricValueType } from '@alpen/core';
import { createEnumFromTS } from '../helpers';

export const MetricValueTypeTC = createEnumFromTS(
  MetricValueType,
  'MetricValueType',
);
