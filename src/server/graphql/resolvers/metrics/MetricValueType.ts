import { MetricValueType as MT } from '../../../../types';
import { schemaComposer } from 'graphql-compose';

export const MetricValueTypeTC = schemaComposer.createEnumTC({
  name: 'MetricValueType',
  values: {
    Gauge: { value: MT.Gauge },
    Rate: { value: MT.Rate },
    Count: { value: MT.Count },
  },
});
