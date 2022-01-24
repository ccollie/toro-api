import formatBytes from 'pretty-bytes';
import React, { useCallback, useEffect, useState } from 'react';
import type { JobCounts, QueueHost, StatsSnapshot } from '@/types';
import { useWhyDidYouUpdate } from '@/hooks';
import { calcErrorPercentage, calcJobRatePerUnit } from '@/lib/stats';
import { roundNumber } from '@/lib';
import { JobCountsPieChart, StatsChart } from '@/components/charts';
import { EmptyJobCounts } from '@/constants';
import { HostStateBadge } from './HostStateBadge';
import { useNavigate, Link } from 'react-location';
import { Statistic } from '@/components/Stats';

interface HostCardProps {
  host: QueueHost;
}

const HostCard: React.FC<HostCardProps> = props => {
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

  const selectHost = useCallback(() => {
    navigate({ to: DetailLink } );
  }, [host.id]);

  function byteFormatter(value: number) {
    return isNaN(value) ? '' : formatBytes(value);
  }

  function StatsCard() {
    return (
      <div>
        <div className="flex">
          <div className="flex-1">
            <div>
              <Statistic
                title={`${host.queueCount}`}
                description="Queues"
                figure={<i className="i-la-inbox" /> }>
              </Statistic>
            </div>
          </div>
          <div className="flex-1">
            <div>
              <Statistic
                title={`${host.workerCount}`}
                description="Workers"
                figure={<i className="i-la-cog text-2xl" />}
              />
            </div>
          </div>
          <div className="flex-1">
            <div>
              <Statistic
                title={`${host.redis?.connected_clients ?? ''}`}
                description="Clients"
                figure={<i className="i-la-users" />}
              />
            </div>
          </div>
          <div className="flex-1">
            <div>
              <Statistic
                title={byteFormatter(host.redis?.used_memory)}
                description="Used Memory"
                figure={<i className="i-la-memory" />}/>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const title = (
    <div className="flex items-center justify-between gap-2">
      <div className="flow">
        <h3>
          <Link to={DetailLink}>{host.name}</Link>
        </h3>
      </div>
      <div className="grow-0">
        <HostStateBadge host={host} />
      </div>
    </div>
  );

  return (
    <div onClick={selectHost}
         className="bg-white px-6 pt-6 pb-2 rounded-lg shadow-lg transition duration-500">
      <div>{title}</div>
      <div>
        <JobCountsPieChart counts={counts} height={300} />
        <div style={{ marginBottom: '8px', height: '56px;' }}>
          <StatsChart
            data={chartData}
            showXAxis={false}
            showYAxis={false}
            fields={['completed']}
          />
        </div>
        <StatsCard />
      </div>
    </div>
  );
};

export default HostCard;
