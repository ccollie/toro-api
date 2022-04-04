import { Paper, Group, Tabs, ActionIcon } from '@mantine/core';
import React, { useCallback, useState } from 'react';
import { useNavigate, useResolvePath } from '@tanstack/react-location';
import { QueueHost } from '@/types';
import {
  QueueIcon,
  AnalyticsIcon,
  CloudServerIcon,
  WorkerIcon, RedisLogo,
} from '@/components/Icons';
import { useRedisInfoModalStore } from 'src/stores';
import shallow from 'zustand/shallow';
import HostStateBadge from '../HostStateBadge';

interface TProps {
  host?: QueueHost;
}

const TabKeys = ['queues', 'workers', 'metrics'];

export const Header = ({ host }: TProps) => {
  const [isRedisModalOpen, onOpenRedisModal, onCloseRedisModal] = useRedisInfoModalStore(
    (state) => [state.isOpen, state.open, state.close],
    shallow
  );
  const resolvePath = useResolvePath();
  const [activeTab, setActiveTab] = useState(getActiveTab());
  const navigate = useNavigate();

  function getActiveTab() {
    const paths = resolvePath('.');
    const parts = paths.split('/');
    const tab = parts[parts.length - 1];
    return TabKeys.indexOf(tab);
  }

  const onToggleRedisModal = useCallback(() => {
    if (isRedisModalOpen) {
      onCloseRedisModal();
    } else {
      const hostId = host?.id ?? '-1';
      onOpenRedisModal(hostId);
    }
  }, [host?.id]);

  const onTabChange = useCallback((tabIndex: number, tabKey: string) => {
    setActiveTab(tabIndex);
    const route = `/hosts/${host?.id}/${tabKey}`;
    navigate({ to: route });
  }, [host?.id]);

  return (
    <div>
      <Paper
        shadow="md"
        id="check"
        mb={5}
        className="md:flex dark:bg-gray-800 mb-5 items-center justify-between px-4 visible py-6"
      >
        <div className="flex items-center text-gray-400">
          <CloudServerIcon size={48} />
          <div className="focus:outline-none text-gray-900 dark:text-gray-100 text-base ml-3">
            <span className="text-3xl">{host?.name}</span>{' '}
            {host && <HostStateBadge host={host} />}
          </div>
        </div>
        <Group position="center" mt={4} mr={10} className="dark:text-gray-400">
          <Tabs variant="pills" active={activeTab} onTabChange={onTabChange}>
            <Tabs.Tab
              label="Queues"
              tabKey="queues"
              icon={<QueueIcon size={36} style={{ display: 'inline-block' }} />}
            />
            <Tabs.Tab
              label="Workers"
              tabKey="workers"
              icon={
                <WorkerIcon size={36} style={{ display: 'inline-block' }} />
              }
            />
            <Tabs.Tab
              label="Overview"
              tabKey="metrics"
              icon={
                <AnalyticsIcon
                  style={{ display: 'inline-block', paddingRight: '5px' }}
                />
              }
            />
          </Tabs>
          <ActionIcon onClick={onToggleRedisModal}>
            <RedisLogo size={48} />
          </ActionIcon>
        </Group>
      </Paper>
    </div>
  );
};

export default Header;
