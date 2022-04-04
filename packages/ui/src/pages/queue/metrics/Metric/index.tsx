import React, { FunctionComponent, useEffect, useState } from 'react';
import ms from 'ms';
import {
  Paper,
  Space,
  LoadingOverlay,
} from '@mantine/core';
import {
  GetMetricDataQueryVariables,
  useGetMetricByIdQuery,
  useGetMetricDataLazyQuery,
} from '@/types';
import type { MetricFragment, TimeseriesDataPoint, TimeSpan } from '@/types';
import DateRangePicker from '@/components/DateRangePicker';
import { EmptyState } from 'src/components';
import { ExclamationTriangleIcon } from 'src/components/Icons';
import { MetricChart } from './chart';
import { parseRelativeDate } from '@/lib/parse-relative-date';
import { parseDate } from '@/lib';
import { addMilliseconds } from 'date-fns';
import { useMatch } from '@tanstack/react-location';
import { LocationGenerics } from 'src/types';

const Index: FunctionComponent = () => {
  const {
    params: { queueId, metricId: id },
  } = useMatch<LocationGenerics>();

  const [metric, setMetric] = useState<MetricFragment>();
  const [metricData, setMetricData] = useState<TimeseriesDataPoint[]>([]);
  const [metricRange, setMetricRange] = useState<TimeSpan>();

  const [rangeStart, setRangeStart] = useState<number | undefined>();
  const [rangeEnd, setRangeEnd] = useState<number | undefined>();

  const { loading, data, error } = useGetMetricByIdQuery({
    variables: {
      queueId,
      metricId: id,
    },
  });

  useEffect(() => {
    if (data && !loading) {
      updateRangeFromServer(data.metric.dateRange);
      setMetric(data?.metric);
    }
  }, [data, loading]);

  const [dataFetchFn, { loading: dataLoading, error: dataFetchError, called }] =
    useGetMetricDataLazyQuery({
      fetchPolicy: 'network-only',
      notifyOnNetworkStatusChange: true,
      variables: getDataFetchVariables(),
      onCompleted(data) {
        if (data) {
          const tsData = data.metric?.data ?? [];
          setMetricData(tsData as TimeseriesDataPoint[]);
        }
      },
    });

  function updateRangeFromServer(range: TimeSpan) {
    if (range) {
      setMetricRange(range);
    }
  }

  useEffect(() => {
    if (metricRange) {
      if (!rangeEnd) {
        const end = parseDate(metricRange.endTime);
        const start = addMilliseconds(end, -1 * ms('2 hr'));
        setRangeEnd(end.getTime());
        setRangeStart(start.getTime());
      }
    }
  }, [rangeStart, rangeEnd, metricRange]);

  function getDataFetchVariables(): GetMetricDataQueryVariables {
    return {
      queueId,
      metricId: id,
      input: {
        start: rangeStart,
        end: rangeEnd,
      },
    };
  }

  useEffect(() => {
    if (rangeStart && rangeEnd) {
      dataFetchFn({ variables: getDataFetchVariables() });
    }
  }, [rangeStart, rangeEnd]);

  function onTimeChange(opts: OnTimeChangeProps) {
    console.log('onTimeChange', opts);
    if (!opts.isInvalid) {
      const start = parseRelativeDate(opts.start);
      const end = parseRelativeDate(opts.end);
      setRangeStart(start);
      setRangeEnd(end);
    }
  }

  return (
    <>
      <Paper
        title={`Metric: ${metric?.name ?? id}`}
        rightSideItems={[
          <DateRangePicker
            key="date-picker"
            end="now"
            isPaused={false}
            onTimeChange={onTimeChange}
            refreshInterval={30000}
            showUpdateButton={true}
            start="now-1h"
          />,
        ]}
      />

      <Space h="sm" />

      <div>
        <LoadingOverlay visible={dataLoading} />
        {dataFetchError && (
          <EmptyState
            icon={<ExclamationTriangleIcon color={'red'} />}
            title={<h2>Error loading metric data</h2>}
          >
            <div>{dataFetchError.message}</div>
            There was an error loading the Dashboard application. Contact your
            administrator for help.
          </EmptyState>
        )}
        {!dataFetchError && !dataLoading && <MetricChart data={metricData} />}
      </div>
    </>
  );
};

export default Index;
