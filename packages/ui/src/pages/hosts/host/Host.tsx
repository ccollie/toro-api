import React from 'react';
import { Outlet, useMatch } from 'react-location';
import type { LocationGenerics } from '@/types';
import { useRedisInfoModalStore } from '@/stores';
import RedisInfo from 'src/components/RedisInfo';
import shallow from 'zustand/shallow';
import Header from './Header';

export const HostPage = () => {
  const { params: { hostId }, data: { host } } = useMatch<LocationGenerics>();
  const [isOpen] = useRedisInfoModalStore(
    (state) => [state.isOpen, state.close],
    shallow
  );

  return (
    <section>
      <Header host={host} />
      <div className="mt-4">
        <Outlet />
      </div>
      <RedisInfo hostId={hostId} isOpen={isOpen}/>
    </section>
  );
};

export default HostPage;
