import { HostWorkersDocument, QueueWorker } from '@/types';
import { useQuery } from '@apollo/client';
import React, { useEffect, useState } from 'react';
import { useMatch } from 'react-location';
import { useHost } from 'src/services';
import { useNetworkSettingsStore } from 'src/stores';
import Header from './Header';
import { Workers as WorkersTable } from '@/components';

import type { LocationGenerics } from '@/types';

export const Workers: React.FC = () => {
  const { params: { hostId } } = useMatch<LocationGenerics>();
  const { host } = useHost(hostId);
  const [workers, setWorkers] = useState<QueueWorker[]>([]);
  // todo: different interval for workers, since they tend not to change frequently
  const pollInterval = useNetworkSettingsStore(store => store.pollingInterval);

  const { loading, called, data } = useQuery(HostWorkersDocument, {
    variables: {
      id: hostId,
    },
    pollInterval,
  });

  useEffect((): void => {
    if (data && data.host) {
      // https://stackoverflow.com/questions/53420055/error-while-sorting-array-of-objects-cannot-assign-to-read-only-property-2-of/53420326
      const workers = [...data.host.workers as QueueWorker[]]
        .sort((a, b) => a.id!.localeCompare(b.id!));
      setWorkers(workers);
    }
  }, [data]);

  return <div>
    <Header host={host} />
    <h3>Workers</h3>
    {loading && !called && (
      <div>Loading...</div>
    )}
    <WorkersTable workers={workers} />
  </div>;
};

export default Workers;
