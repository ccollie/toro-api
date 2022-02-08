import { useQuery } from '@apollo/client';
import { LoadingOverlay } from '@mantine/core';
import React, { useState } from 'react';
import Banner from '@/components/Banner/Banner';
import HostCard from 'src/pages/hosts/HostCard';
import { useNetworkSettingsStore } from 'src/stores';
import { HostsPageDataDocument, HostsPageDataQuery, QueueHost } from 'src/types';

export function Home() {
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
    <div className="p-2">
      <div className="text-lg">Welcome Home!</div>
      <Banner />
      <div className="max-w-xl">
        <div>
          <LoadingOverlay visible={!called && loading} />
          <div className="flex flex-wrap flex-start gap-2 gap-y-2">
            {hosts.map(host => (
              <HostCard host={host} key={host.id} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
