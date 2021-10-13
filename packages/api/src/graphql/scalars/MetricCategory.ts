import { MetricCategory as MC } from '@alpen/core/metrics';
import { createEnumFromTS } from './types';

const MetricCategoryTC = createEnumFromTS(MC, 'MetricCategory');
export const MetricCategory = MetricCategoryTC.getType();
