import { LoadingOverlay } from '@mantine/core';
import React from 'react';
import { useMatch } from '@tanstack/react-location';
import type { LocationGenerics } from '@/types';
import { useHostQuery } from '@/services/host/hooks/use-host-query';
import QueueFilterToolbar from '../QueueFilterToolbar';
import { useHostQueueFilter } from '@/services';
import { useWhyDidYouUpdate } from '@/hooks';
import { QueueCard } from '@/pages/queue/QueueCard';

export const HostQueues = () => {
  const { params: { hostId } } = useMatch<LocationGenerics>();

  // Update the filter in the store when the URL changes
  const { navigate, getFilterFromRoute } = useHostQueueFilter(hostId);
  const filter = getFilterFromRoute();

  const match = useMatch<LocationGenerics>();
  useWhyDidYouUpdate('HostPage', { match });
  const range = 'last_hour';

  const { loading, called, filteredQueues } = useHostQuery(hostId, filter, range);

  return (
    <div>
      <LoadingOverlay visible={loading && !called} />
      <QueueFilterToolbar
        hostId={hostId}
        filter={filter}
        onFilterUpdated={navigate}
      />

      <div className="mx-auto grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

        <LoadingOverlay visible={loading && !called} />
        {filteredQueues.map((queue) => (
          <div className="w-full" key={queue.id}>
            <QueueCard
              key={`q-${queue.id}`}
              queue={queue}
              stats={queue.stats}
              statsSummary={queue.statsAggregate}
            />
          </div>
        ))}

      </div>

    </div>
  );
};

export default HostQueues;
