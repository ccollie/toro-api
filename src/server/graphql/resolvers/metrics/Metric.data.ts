import { FieldConfig } from '../utils';
import { schemaComposer } from 'graphql-compose';
import { TimeseriesDataPointTC } from '../../resolvers/stats/types';
import { getQueueManager } from '../../helpers';
import { BaseMetric } from '../../imports';
import { TimeseriesDataPoint } from '../../imports';
import { parseRange } from '../../../lib/datetime';
import boom from '@hapi/boom';

export const metricDataFC: FieldConfig = {
  type: TimeseriesDataPointTC.List.NonNull,
  args: {
    input: schemaComposer.createInputTC({
      name: 'MetricDataInput',
      fields: {
        start: {
          type: 'Date',
        },
        end: {
          type: 'Date',
        },
        range: {
          type: 'String',
          description:
            'An expression specifying the range to query e.g. yesterday, last_7days',
        },
        limit: 'Int',
      },
    }).NonNull,
  },
  async resolve(parent: BaseMetric, { input }): Promise<TimeseriesDataPoint[]> {
    const { start, end, range } = input;
    let _start, _end;
    if (start && end) {
      _start = start;
      _end = end;
    } else if (range) {
      const { start, end } = parseRange(range);
      _start = start;
      _end = end;
    } else {
      throw boom.badRequest('Either start/end or range must be specified');
    }
    const manager = getQueueManager(parent.queueId);
    const metrics = manager.metricManager;
    return metrics.getMetricData(parent, _start, _end);
  },
};
