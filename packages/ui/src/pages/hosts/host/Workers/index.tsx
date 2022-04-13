import { HostWorkersDocument, QueueWorker } from '@/types';
import { useQuery } from '@apollo/client';
import { LoadingOverlay } from '@mantine/core';
import React, { useEffect, useState } from 'react';
import { useMatch } from '@tanstack/react-location';
import { useNetworkSettingsStore } from 'src/stores';
import { Workers as WorkersTable } from '@/pages/queue/Workers/Workers';

import type { LocationGenerics } from '@/types';

export const HostWorkers = () => {
  const {
    params: { hostId },
  } = useMatch<LocationGenerics>();
  const [workers, setWorkers] = useState<QueueWorker[]>([]);
  // todo: different interval for workers, since they tend not to change frequently
  const pollInterval = useNetworkSettingsStore(
    (store) => store.pollingInterval,
  );

  const { loading, called, data } = useQuery(HostWorkersDocument, {
    variables: {
      id: hostId,
    },
    pollInterval,
  });

  useEffect((): void => {
    if (data && data.host) {
      // https://stackoverflow.com/questions/53420055/error-while-sorting-array-of-objects-cannot-assign-to-read-only-property-2-of/53420326
      const workers = [...(data.host.workers as QueueWorker[])]
        .sort((a, b) => a.id!.localeCompare(b.id!));
      setWorkers(workers);
    }
  }, [data]);

  return (
    <div>
      <h3>Workers</h3>
      <LoadingOverlay visible={loading && !called} />
      <WorkersTable workers={workers} />
    </div>
  );
};

export default HostWorkers;
