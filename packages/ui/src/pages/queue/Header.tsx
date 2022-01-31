import React, { useCallback, useState } from 'react';
import { useNavigate, useResolvePath } from 'react-location';
import QueueMenu from './QueueMenu';
import QueueStateBadge from './QueueStateBadge';
import type { Queue } from '@/types';
import { Group, Paper, Tabs } from '@mantine/core';
import { WorkerIcon, QueueIcon, ClockIcon, CogsIcon } from '@/components/Icons';

interface TProps {
  queue: Queue;
}

const TabKeys = ['jobs', 'scheduled-jobs', 'workers'];

export const Header = ({ queue }: TProps) => {
  const resolvePath = useResolvePath();
  const navigate = useNavigate();

  function getActiveTab() {
    const paths = resolvePath('.');
    const parts = paths.split('/');
    const tab = parts[parts.length - 1];
    return TabKeys.indexOf(tab);
  }

  const [activeTab, setActiveTab] = useState(getActiveTab());

  const onTabChange = useCallback((tabIndex: number, tabKey: string) => {
    setActiveTab(tabIndex);
    const route = `/queues/${queue.id}/${tabKey}`;
    navigate({ to: route });
  }, []);

  return (
    <div>
      <Paper
        padding="xl"
        shadow="sm"
        radius="md"
        className="md:flex dark:bg-gray-800 mb-5 items-center justify-between px-4 py-6 sticky top-0"
      >
        <div className="flex items-center text-gray-400">
          <QueueIcon size={36} style={{ display: 'inline-block' }} />
          <p
            className="focus:outline-none text-gray-600 dark:text-gray-100 text-base ml-3"
          >
            <span className="text-3xl mr-2">{queue.name}</span>{' '}
            {queue && <QueueStateBadge queue={queue} />}
          </p>
        </div>
        <Group position="center" mt={4}>
          <Tabs variant="pills" active={activeTab} onTabChange={onTabChange}>
            <Tabs.Tab
              label="Jobs"
              tabKey="jobs"
              icon={<CogsIcon size={36} style={{ display: 'inline-block' }} />}
            />
            <Tabs.Tab
              label="Repeatable"
              tabKey="scheduled-jobs"
              icon={<ClockIcon size={36} style={{ display: 'inline-block' }} />}
            />
            <Tabs.Tab
              label="Workers"
              tabKey="workers"
              icon={
                <WorkerIcon size={36} style={{ display: 'inline-block' }} />
              }
            />
          </Tabs>
          <div aria-label="dots icon" role="button">
            <QueueMenu queue={queue} />
          </div>
        </Group>
      </Paper>
    </div>
  );
};

export default Header;
