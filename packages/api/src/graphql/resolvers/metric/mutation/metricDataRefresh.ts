import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../utils';
import { schemaComposer } from 'graphql-compose';
import { BaseMetric } from '@alpen/core/metrics';
import { parseRange } from '@alpen/shared';
import boom from '@hapi/boom';
import { MetricDataRefreshInput } from '../../../typings';
import { MetricTC } from '../model';

const MetricDataRefreshInputTC = schemaComposer.createInputTC({
  name: 'MetricDataRefreshInput',
  fields: {
    metricId: 'String!',
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
  },
});

const MetricDataRefreshPayloadTC = schemaComposer.createObjectTC({
  name: 'MetricDataRefreshPayload',
  fields: {
    metricId: 'String!',
    metric: MetricTC.NonNull,
    start: {
      type: 'Date',
    },
    end: {
      type: 'Date',
    },
  },
});

export const metricDataRefresh: FieldConfig = {
  type: MetricDataRefreshPayloadTC.List.NonNull,
  args: {
    input: MetricDataRefreshInputTC.NonNull,
  },
  async resolve(
    parent: BaseMetric,
    { input }: { input: MetricDataRefreshInput },
    { accessors }: EZContext,
  ) {
    const { start, end, range, metricId } = input;
    let _start, _end;
    if (start && end) {
      _start = start;
      _end = end;
    } else if (range) {
      const { startTime, endTime } = parseRange(range);
      _start = startTime;
      _end = endTime;
    } else {
      throw boom.badRequest('Either start/end or range must be specified');
    }
    const manager = accessors.getQueueManager(parent.queueId, true);
    const metrics = manager.metricManager;
    const metric = await metrics.getMetric(metricId);
    if (!metric) {
      throw boom.notFound(`Cannot find metric with id ${metricId}`);
    }

    // queue work. Should we run immediately to give feedback ?
    manager.addWork(() => metrics.refreshMetricData(metric, _start, _end));

    return {
      metric,
      start: _start,
      end: _end,
    };
  },
};
