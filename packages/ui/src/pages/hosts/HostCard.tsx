import { Group, Paper, Text } from '@mantine/core';
import formatBytes from 'pretty-bytes';
import React, { useEffect, useState } from 'react';
import type { JobCounts, QueueHost, StatsSnapshot } from '@/types';
import { useWhyDidYouUpdate } from '@/hooks';
import { calcErrorPercentage, calcJobRatePerUnit } from '@/lib/stats';
import { roundNumber } from '@/lib';
import { JobCountsPieChart, StatsChart } from '@/components/charts';
import { EmptyJobCounts } from '@/constants';
import { HostStateBadge } from './HostStateBadge';
import { useNavigate, Link } from '@tanstack/react-location';
import Statistic from '@/components/Stats/Statistic';

interface HostCardProps {
  host: QueueHost;
}

const HostCard = (props: HostCardProps) => {
  const { host } = props;
  const [hourStats, setHourStats] = useState<StatsSnapshot>();
  const [errorPercentage, setErrorPercentage] = useState(0);
  const [jobsPerMinute, setJobsPerMinute] = useState(0);
  const navigate = useNavigate();

  useWhyDidYouUpdate('HostCard', host);
  const [chartData, setChartData] = useState<StatsSnapshot[]>([]);

  useEffect(() => {
    setChartData(host.stats ?? []);
  }, [host?.stats]);

  const counts: JobCounts = {
    ...EmptyJobCounts,
    ...host.jobCounts,
  };

  function round(value: number): number {
    return parseFloat(roundNumber(value));
  }

  useEffect(() => {
    if (host.lastStatsSnapshot) {
      const stats = host.lastStatsSnapshot;
      const jobRate = calcJobRatePerUnit(stats, 'minute');
      setHourStats(stats);
      setErrorPercentage(round(100 * calcErrorPercentage(stats)));
      setJobsPerMinute(jobRate);
    }
  }, [host.lastStatsSnapshot]);

  const DetailLink = `/hosts/${host.id}`;

  const selectHost = () => {
    navigate({ to: DetailLink });
  };

  function byteFormatter(value: number) {
    return isNaN(value) ? '' : formatBytes(value);
  }

  function StatsCard() {
    return (
      <Statistic.Group widths={5}>
        <Statistic>
          <Statistic.Value>{host.queueCount}</Statistic.Value>
          <Statistic.Label>Queues</Statistic.Label>
        </Statistic>
        <Statistic>
          <Statistic.Value>{host.workerCount}</Statistic.Value>
          <Statistic.Label>Workers</Statistic.Label>
        </Statistic>
        <Statistic>
          <Statistic.Value>
            {host.redis?.connected_clients ?? ''}
          </Statistic.Value>
          <Statistic.Label>Clients</Statistic.Label>
        </Statistic>
        <Statistic>
          <Statistic.Value>
            {byteFormatter(host.redis?.used_memory)}
          </Statistic.Value>
          <Statistic.Label>Used Memory</Statistic.Label>
        </Statistic>
      </Statistic.Group>
    );
  }

  const title = (
    <Group position="apart" mb={8}>
      <div className="flow">
        <Link to={DetailLink}>
          <Text size="md" weight={700}>
            {host.name}
          </Text>
        </Link>
        <div>
          <Text size="sm" color="dimmed">
            {host.uri}
          </Text>
        </div>
      </div>
      <div className="grow-0">
        <HostStateBadge host={host} />
      </div>
    </Group>
  );

  return (
    <Paper
      shadow="lg"
      radius="md"
      onClick={selectHost}
      className="px-6 pt-6 pb-2 transition duration-500"
    >
      <div>{title}</div>
      <div>
        <StatsCard />
        <JobCountsPieChart counts={counts} height={300} legend="advanced"/>
        <div style={{ marginBottom: '8px', height: '56px' }}>
          <StatsChart
            data={chartData}
            showXAxis={false}
            showYAxis={false}
            fields={['completed']}
          />
        </div>
      </div>
    </Paper>
  );
};

export default HostCard;
