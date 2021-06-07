import { MetricValueType } from '@src/types';
import { createEnumFromTS } from '../../../helpers';

export const MetricValueTypeTC = createEnumFromTS(
  MetricValueType,
  'MetricValueType',
);
