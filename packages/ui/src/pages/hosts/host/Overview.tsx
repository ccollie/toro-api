import { ErrorChart, JobCountsPieChart, StatsChart } from '@/components/charts';
import { useLazyQuery } from '@apollo/client';
import React, { useEffect, useState } from 'react';
import { useMatch } from 'react-location';
import type { ErrorDataItem } from '@/components/charts';
import { calcErrorPercentage } from '@/lib/stats';
import { Statistic, StatisticCard } from '@/components/Stats';
import { useInterval, useUpdateEffect } from '@/hooks';
import { useHost } from '@/services/host';
import { RedisStats } from 'src/components/RedisStats/RedisStats';
import Header from './Header';
import { usePreferencesStore } from '@/stores';
import { HostOverviewDocument } from '@/types';
import type { JobCounts, LocationGenerics, Meter, StatsSnapshot, StatsDataField } from '@/types';
import prettyMilliseconds from 'pretty-ms';

export const HostOverview: React.FC = () => {
  const { params: { hostId } } = useMatch<LocationGenerics>();
  const { host } = useHost(hostId);

  const [snapshots, setSnapshots] = useState<StatsSnapshot[]>([]);
  const [errorChartData, setErrorChartData] = useState<ErrorDataItem[]>([]);
  const [errorPercentage, setErrorPercentage] = useState(0);
  const [activeCounts, setActiveCounts] = useState<JobCounts>({ delayed: 0, waiting: 0, active: 0 });
  const [activeCount, setActiveCount] = useState(0);
  const pollInterval= usePreferencesStore(store => store.pollingInterval);

  const range = 'last_hour';
  const RuntimeFields: StatsDataField[] = ['mean', 'median', 'p90', 'p95', 'p99'];

  // todo: use actual date-times so we can cache results
  const [getData, { loading, data, called }] = useLazyQuery(
    HostOverviewDocument,
    {
      fetchPolicy: 'cache-and-network',
    },
  );

  function fetch() {
    getData({
      variables: {
        id: hostId,
        range,
      },
    });
  }

  const { reset: resetInterval } = useInterval(() => {
    if (!loading) {
      fetch();
    }
  }, pollInterval, { immediate: true });

  useUpdateEffect(() => {
    fetch();
    resetInterval();
  }, [hostId, range]);

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
      }
      setActiveCount(active.active + active.waiting + active.delayed);
      setActiveCounts(active);
    }
  }, [data, loading]);


  function statsFormatter(value: any) {
    const val = prettyMilliseconds(parseInt(value), { compact: false });
    return <span>{val}</span>;
  }

  function formatRate(meter: Meter | undefined) {
    const value= (meter?.m1Rate ?? 0);
    if (value === 0) return '';
    const val = value.toFixed(1);
    return <span>{val}/min</span>;
  }

  return (
  <div>
    <Header host={host} />
    {host?.redis && <RedisStats stats={host?.redis} />}
    <>
      <div className="flex">
        <div className="node">
          {activeCount && <JobCountsPieChart counts={activeCounts} legend="advanced"/>}
        </div>
      </div>
      <StatisticCard>
        <StatisticCard>
          <Statistic
            title="Response - Mean"
            value={statsFormatter(host?.statsAggregate?.mean ?? 0)}
          />
          <Statistic
            title="Response - 95th"
            value={statsFormatter(host?.statsAggregate?.p95 ?? 0)}
          />
          <Statistic
            title="Throughput"
            value={formatRate(host?.throughput)}
          />
          <Statistic
            title="Error Rate"
            value={formatRate(host?.errorRate)}
          />
          <Statistic
            value={errorPercentage.toFixed(1)}
            title="Error %"/>
        </StatisticCard>
      </StatisticCard>
      <div>
        {/*<TimeRangeToolbar onRangeChange={onDateRangeChange} />*/}
      </div>
      <div className="w-full">
        <h3>Runtime</h3>
        {loading && !called && <p>Loading...</p>}
        <StatsChart
          fields={RuntimeFields}
          data={snapshots}
        />
      </div>
      <div className="flex flex-wrap w-full mt-4" style={ { height: 300 }}>
        <div className="flex-1">
          <div title="Completed">
            <h3>Throughput</h3>
            <StatsChart
              fields={['completed']}
              data={snapshots}
            />
          </div>
        </div>
        <div className="flex-1">
          <div title="Errors">
            <h3>Errors</h3>
            <ErrorChart
              data={errorChartData}
            />
          </div>
        </div>
      </div>
    </>
  </div>
  )
};

export default HostOverview;
