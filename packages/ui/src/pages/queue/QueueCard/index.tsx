import { Center, Group, Paper } from '@mantine/core';
import React, { useEffect, useState } from 'react';
import type { Queue, StatsSnapshot, JobStatus } from '@/types';
import { Link } from '@tanstack/react-location';
import { JobCountsPieChart } from '@/components/charts';
import Statistic from '@/components/Stats/Statistic';
import { useWhyDidYouUpdate } from '@/hooks';
import { calcErrorPercentage } from '@/lib/stats';
import { calcJobCountTotal } from 'src/services';
import QueueMenu from '../QueueMenu';
import QueueStateBadge from '../QueueStateBadge';
import prettyMilliseconds from 'pretty-ms';

interface QueueCardProps {
  queue: Queue;
  stats?: StatsSnapshot[];
  statsSummary?: StatsSnapshot | null;
}

const formatter = Intl.NumberFormat('en', { notation: 'compact' });

export const QueueCard = (props: QueueCardProps) => {
  const { queue, statsSummary } = props;
  const [errorPercentage, setErrorPercentage] = useState(0);
  // const navigate = useNavigate();

  function getCount(status: JobStatus): string {
    const counts = queue.jobCounts || {};
    const value = calcJobCountTotal(counts, (status === 'latest') ? undefined : status);
    return formatter.format(value);
  }

  useEffect(() => {
    if (statsSummary) {
      const percentage = calcErrorPercentage(statsSummary);
      setErrorPercentage(percentage);
    }
  }, [statsSummary]);


  function statsFormatter(value: any) {
    if (value === 0) return '0';
    const val = prettyMilliseconds(parseInt(value), { compact: true });
    return <span>{val}</span>;
  }

  function StatsCardNew({ stats }: { stats: StatsSnapshot }) {
    const median = statsFormatter(stats.median);
    const mean = statsFormatter(stats.mean);
    const p95 = statsFormatter(stats.p95);

    return (
      <div>
        <Statistic.Group size="xs" widths={3}>
          <Statistic label="Median" value={median} size="xs"/>
          <Statistic label="Mean" value={mean} size="xs"/>
          <Statistic label="P95" value={p95} size="xs"/>
        </Statistic.Group>
      </div>
    );
  }

  useWhyDidYouUpdate('QueueCard', props);

  return (
    <Paper shadow="lg" radius="md" p="sm">
      <div className="p-5">
        <header className="flex justify-between items-start mb-2">
          {/* Icon */}
          <div className="mt-1 flex-1">
            <Link to={`/queues/${queue.id}/jobs`} className="font-semibold">{queue.name}</Link>
            <QueueStateBadge queue={queue}/>
          </div>
          {/* Menu button */}
          <div className="flex-none">
            <QueueMenu queue={queue}/>
          </div>
        </header>
        <Group position="apart" className="mt-4">
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase mb-1">Completed</div>
            <div className="flex items-start">
              <div className="text-3xl font-semibold text-gray-600 mr-2">
                <Link to={`/queues/${queue.id}/jobs?status=completed`}>
                  {getCount('completed')}
                </Link>
              </div>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase mb-1">Failed</div>
            <div className="flex items-start">
              <div className="text-3xl font-semibold text-gray-600 mr-2">
                <Link to={`/queues/${queue.id}/jobs?status=failed`}>
                  {getCount('failed')}
                </Link>
              </div>
            </div>
          </div>
        </Group>
        <div className="grow">
          {/* Change the height attribute to adjust the chart height */}
          <Center>
            <JobCountsPieChart counts={queue.jobCounts} height={300} />
          </Center>
        </div>
        <div className="mb-1">
          {statsSummary && <StatsCardNew stats={statsSummary} />}
        </div>
      </div>
    </Paper>
  );
};

export default QueueCard;
