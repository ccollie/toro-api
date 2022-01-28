import React from 'react';
import { Link } from 'react-location';
import QueueMenu from './QueueMenu';
import QueueStateBadge from './QueueStateBadge';
import type { Queue } from '@/types';
import { Group, Paper } from '@mantine/core';
import { WorkerIcon, QueueIcon, ClockIcon, CogsIcon } from '@/components/Icons';

interface TProps {
  queue: Queue;
}

export const Header = ({ queue }: TProps) => {
  const base = `/queues/${queue.id}`;
  return <div>
    <Paper id="check" padding="xl" shadow="sm" radius="md"
         className="md:flex dark:bg-gray-800 mb-5 items-center justify-between px-4 py-6 sticky top-0">
      <div className="flex items-center text-gray-400">
        <QueueIcon size={36} style={{ display: 'inline-block' }}/>
        <p tabIndex={0} className="focus:outline-none text-gray-600 dark:text-gray-100 text-base ml-3">
          <span className="text-3xl mr-2">{queue.name}</span> {queue && <QueueStateBadge queue={queue}/>}</p>
      </div>
      <Group position="center" mt={4}>
        <div aria-label="jobs" role="button">
          <Link to={`${base}/jobs`}>
            <CogsIcon size={32} style={{ paddingRight: '5px', display: 'inline-block' }}/>
            Jobs
          </Link>
        </div>
        <div aria-label="scheduled jobs" role="button">
          <Link to={`${base}/scheduled-jobs`}>
            <ClockIcon style={{ paddingRight: '5px',  display: 'inline-block' }} size={24}/>
            Repeatable
          </Link>
        </div>
        <div aria-label="bell" role="button">
          <Link to={`${base}/workers`}>
            <WorkerIcon style={{ paddingRight: '5px',  display: 'inline-block' }} size={36}/>
            Workers
          </Link>
        </div>
        <div aria-label="dots icon" role="button">
          <QueueMenu queue={queue} />
        </div>
      </Group>
    </Paper>
  </div>;
};

export default Header;
