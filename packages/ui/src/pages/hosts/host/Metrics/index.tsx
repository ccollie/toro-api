import { ErrorChart, JobCountsPieChart, StatsChart } from '@/components/charts';
import { LoadingOverlay } from '@mantine/core';
import React, { useEffect, useState } from 'react';
import { useMatch } from 'react-location';
import type { ErrorDataItem } from '@/components/charts';
import { calcErrorPercentage } from '@/lib/stats';
import { StatisticCard } from '@/components/Stats';
import { useHost } from '@/services/host';
import { useNetworkSettingsStore } from '@/stores/network-settings';
import Statistic from '@/components/Stats/Statistic';
import StatisticGroup from '@/components/Stats/StatisticGroup';
import { useHostOverviewQuery } from '@/types';
import type {
  JobCounts,
  LocationGenerics,
  Meter,
  StatsSnapshot,
  StatsDataField,
} from '@/types';
import prettyMilliseconds from 'pretty-ms';

export const HostMetrics = () => {
  const {
    params: { hostId },
  } = useMatch<LocationGenerics>();
  const { host } = useHost(hostId);

  const [snapshots, setSnapshots] = useState<StatsSnapshot[]>([]);
  const [errorChartData, setErrorChartData] = useState<ErrorDataItem[]>([]);
  const [errorPercentage, setErrorPercentage] = useState(0);
  const [activeCounts, setActiveCounts] = useState<JobCounts>({
    delayed: 0,
    waiting: 0,
    active: 0,
  });
  const [activeCount, setActiveCount] = useState(0);
  const pollInterval = useNetworkSettingsStore(
    (store) => store.pollingInterval,
  );

  const range = 'last_hour';
  const RuntimeFields: StatsDataField[] = [
    'mean',
    'median',
    'p90',
    'p95',
    'p99',
  ];

  // todo: use actual date-times so we can cache results
  const { data, loading, called } = useHostOverviewQuery({
    variables: {
      id: hostId,
      range,
    },
    pollInterval,
  });

  function getErrorChardData(snaps: StatsSnapshot[]): ErrorDataItem[] {
    return snaps.map((snap) => {
      return {
        date: +new Date(snap.endTime),
        failed: snap.failed,
        completed: snap.completed,
      };
    });
  }

  useEffect(() => {
    if (data && data.host && !loading) {
      const host = data.host;
      setSnapshots(host.stats ?? []);
      setErrorChartData(getErrorChardData(snapshots));
      const summary = host.statsAggregate;
      if (summary) {
        const perc = calcErrorPercentage(summary as StatsSnapshot);
        setErrorPercentage(perc);
      }
      const counts = host.jobCounts;
      const active = {
        delayed: counts.delayed ?? 0,
        waiting: counts.waiting ?? 0,
        active: counts.active ?? 0,
      };
      setActiveCount(active.active + active.waiting + active.delayed);
      setActiveCounts(active);
    }
  }, [data, loading]);

  function statsFormatter(value: any) {
    const val = prettyMilliseconds(parseInt(value), { compact: false });
    return <span>{val}</span>;
  }

  function formatRate(meter: Meter | undefined) {
    const value = meter?.m1Rate ?? 0;
    if (value === 0) return '';
    const val = value.toFixed(1);
    return <span>{val}/min</span>;
  }

  return (
    <div>
      <>
        <div className="flex">
          <div className="node">
            {activeCount && (
              <JobCountsPieChart counts={activeCounts} legend="advanced" />
            )}
          </div>
        </div>
        <StatisticCard>
          <StatisticGroup>
            <Statistic
              label="Response - Mean"
              value={statsFormatter(host?.statsAggregate?.mean ?? 0)}
            />
            <Statistic
              label="Response - 95th"
              value={statsFormatter(host?.statsAggregate?.p95 ?? 0)}
            />
            <Statistic
              label="Throughput"
              value={formatRate(host?.throughput)}
            />
            <Statistic label="Error Rate" value={formatRate(host?.errorRate)} />
            <Statistic value={errorPercentage.toFixed(1)} label="Error %" />
          </StatisticGroup>
        </StatisticCard>
        <div>{/*<TimeRangeToolbar onRangeChange={onDateRangeChange} />*/}</div>
        <div className="w-full">
          <h3>Runtime</h3>
          <LoadingOverlay visible={loading && !called} />
          <StatsChart fields={RuntimeFields} data={snapshots} />
        </div>
        <div className="flex flex-wrap w-full mt-4" style={{ height: 300 }}>
          <div className="flex-1">
            <div title="Completed">
              <h3>Throughput</h3>
              <StatsChart fields={['completed']} data={snapshots} />
            </div>
          </div>
          <div className="flex-1">
            <div title="Errors">
              <h3>Errors</h3>
              <ErrorChart data={errorChartData} />
            </div>
          </div>
        </div>
      </>
    </div>
  );
};

export default HostMetrics;