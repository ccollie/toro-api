import React from 'react';
import { Outlet, useMatch } from '@tanstack/react-location';
import type { LocationGenerics } from '@/types';
import { useWhyDidYouUpdate } from 'src/hooks';
import Header from './Header';

export const QueueHome = () => {
  const {
    data: { queue },
  } = useMatch<LocationGenerics>();

  useWhyDidYouUpdate('QueueHome', { queue });

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
