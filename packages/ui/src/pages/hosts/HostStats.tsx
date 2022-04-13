import React from 'react';
import {
  Statistic,
  StatisticCard,
  StatisticsGroup,
  statsDurationFormat,
  statsRateFormat,
} from '@/components/Stats';
import type { QueueHost } from 'src/types';

interface HostStatsProps {
  host: QueueHost;
}

export const HostStats: React.FC<HostStatsProps> = ({ host }) => {
  return (
    <StatisticsGroup>
      <StatisticCard>
        <Statistic
          title="Response - Mean"
          value={statsDurationFormat(host?.statsAggregate?.mean)}
        />
      </StatisticCard>
      <div className="divider divider-vertical" />
      <StatisticCard>
        <Statistic
          title="Response - 95th"
          value={statsDurationFormat(host?.statsAggregate?.p95)}
        />
      </StatisticCard>
      <div className="divider divider-vertical" />
      <StatisticCard>
        <Statistic
          title="Throughput"
          value={statsRateFormat(host?.throughput.m1Rate, 'min')}
        />
      </StatisticCard>
      <div className="divider divider-vertical" />
      <StatisticCard>
        <Statistic
          title="Error Rate"
          value={statsRateFormat(host?.errorRate.m1Rate, 'min')}
        />
      </StatisticCard>
    </StatisticsGroup>
  );
};
