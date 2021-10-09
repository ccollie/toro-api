import { MetricCategory as MC } from '@alpen/core';
import { createEnumFromTS } from '../helpers';

const MetricCategoryTC = createEnumFromTS(MC, 'MetricCategory');
export const MetricCategory = MetricCategoryTC.getType();
