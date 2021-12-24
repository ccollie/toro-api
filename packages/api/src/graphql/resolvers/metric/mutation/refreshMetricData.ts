import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../utils';
import { schemaComposer } from 'graphql-compose';
import { BaseMetric } from '@alpen/core';
import { parseRange } from '@alpen/shared';
import boom from '@hapi/boom';
import { MetricDataRefreshInput } from '../../../typings';
import { MetricTC } from '../model';

const RefreshMetricDataInput = schemaComposer.createInputTC({
  name: 'RefreshMetricDataInput',
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

const RefreshMetricDataRefreshResult = schemaComposer.createObjectTC({
  name: 'RefreshMetricDataResult',
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

export const refreshMetricData: FieldConfig = {
  type: RefreshMetricDataRefreshResult.List.NonNull,
  args: {
    input: RefreshMetricDataInput.NonNull,
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
