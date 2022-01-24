import React from 'react';
import { Outlet, useMatch } from 'react-location';
import { RedisStats } from '@/components/RedisStats/RedisStats';
import type { LocationGenerics } from '@/types';
import { useStore } from '@/stores';

export const HostPage: React.FC = () => {
  const { params: { hostId } } = useMatch<LocationGenerics>();
  const host = useStore(state => state.findHost(hostId));

  return (
    <div>
      <h1>{host?.name}</h1>
      <h2>{host?.uri}</h2>
      {host?.redis && <RedisStats stats={host?.redis} />}

      <Outlet />
    </div>
  );
};

export default HostPage;
