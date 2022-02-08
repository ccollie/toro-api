import { HostsPageDataDocument, HostsPageDataQuery, QueueHost } from '@/types';
import { useQuery } from '@apollo/client';
import { LoadingOverlay } from '@mantine/core';
import React, { useState } from 'react';
import { useNetworkSettingsStore } from '@/stores/network-settings';
import HostCard from './HostCard';
import Header from './Header';

const HostsPage: React.FC = () => {
  const range = 'last_hour';
  const pollInterval = useNetworkSettingsStore(state => state.pollingInterval);
  const [hosts, setHosts] = useState<QueueHost[]>([]);

  const { loading, called } = useQuery<HostsPageDataQuery>(HostsPageDataDocument,{
    variables: {
      range,
    },
    pollInterval,
    onCompleted: (data) => {
      setHosts(data.hosts as QueueHost[]);
    },
  });

  return (
    <div>
      <LoadingOverlay visible={!called && loading} />
      <Header />
      <div className="flex flex-wrap flex-start gap-2 gap-y-2">
        {hosts.map(host => (
          <HostCard host={host} key={host.id} />
        ))}
      </div>
    </div>
  );
};

export default HostsPage;
