import { HostsPageDataDocument, QueueHost } from '@/types';
import { useQuery } from '@apollo/client';
import React, { useEffect, useState } from 'react';
import HostCard from './HostCard';
import { usePreferencesStore } from '@/stores';

const HostsPage: React.FC = () => {
  const range = 'last_hour';
  const pollingInterval = usePreferencesStore(state => state.pollingInterval);
  const [hosts, setHosts] = useState<QueueHost[]>([]);

  const { loading, data, called } = useQuery(HostsPageDataDocument,{
    variables: {
      range,
    },
    pollInterval: pollingInterval
  });

  useEffect((): void => {
    if (data && data.hosts) {
      setHosts(data.hosts as QueueHost[]);
    }
  }, [data]);

  return (
    <div>
      <h1>Hosts</h1>
      {(!called && loading) && (
        <div>
          <p>Loading...</p>
        </div>
      )}
      <div className="flex flex-wrap flex-start gap-2 gap-y-2">
        {hosts.map(host => (
          <HostCard host={host} key={host.id} />
        ))}
      </div>
    </div>
  );
};

export default HostsPage;
