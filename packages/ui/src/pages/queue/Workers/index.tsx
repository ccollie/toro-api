import type { LocationGenerics, QueueWorker } from '@/types';
import { GetQueueWorkersDocument } from '@/types';
import { useQuery } from '@apollo/client';
import React, { useEffect, useState } from 'react';
import { useMatch } from '@tanstack/react-location';
import { Workers as WorkersTable } from '@/components';
import { useNetworkSettingsStore } from '@/stores';

export const Workers = () => {
  const {
    params: { queueId: id }
  } = useMatch<LocationGenerics>();

  const [workers, setWorkers] = useState<QueueWorker[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const pollInterval = useNetworkSettingsStore(state => state.pollingInterval);

  const { loading, data, called } = useQuery(GetQueueWorkersDocument, {
    variables: { id },
    pollInterval,
  });

  useEffect(() => {
    if (data && data.queue) {
      // eslint-disable-next-line max-len
      // https://stackoverflow.com/questions/53420055/error-while-sorting-array-of-objects-cannot-assign-to-read-only-property-2-of/53420326
      const workers = [...data.queue.workers as QueueWorker[]]
        .sort((a, b) => a.id!.localeCompare(b.id!));
      setWorkers(workers);
    }
  }, [data]);

  useEffect(() => {
    const isLoading = loading && !called;
    setIsLoading(isLoading);
  }, [loading, called]);

  return (
    <section>
      <WorkersTable workers={workers} loading={isLoading && !called}/>
    </section>
  );
};

export default Workers;
