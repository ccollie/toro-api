import React from 'react';
import { Outlet, useMatch } from 'react-location';
import type { LocationGenerics } from '@/types';
import Header from './Header';
import { useQueue } from '@/hooks';

export const QueueHome = () => {
  const {
    params: { queueId },
  } = useMatch<LocationGenerics>();

  const { queue } = useQueue(queueId);
//  const actions = useQueueActions(id);

  // todo: load

  if (!queue) {
    return <section>Queue Not found</section>;
  }

  return (
    <section>
      <Header queue={queue} />
      <div className="mt-4">
        <Outlet />
      </div>
    </section>
  );
};

export default QueueHome;
