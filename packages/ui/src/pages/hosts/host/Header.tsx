import { Paper, Group } from '@mantine/core';
import React from 'react';
import { Link, useMatchRoute } from 'react-location';
import { QueueHost } from '@/types';
import { QueueIcon, AnalyticsIcon, CloudServerIcon, WorkerIcon } from '@/components/Icons';
import { isEmpty } from '@/lib';
import HostStateBadge from '../HostStateBadge';

interface TProps {
  host?: QueueHost;
}

interface PageLinkProps {
  route: string;
  icon: React.ReactNode;
  label: string;
  ariaLabel?: string;
}

function PageLink(props: PageLinkProps) {
  const { route, icon, label, ariaLabel } = props;
  const matchRoute = useMatchRoute();
  const isActive = !isEmpty(matchRoute({ to: route }));

  return (
    <div aria-label={ariaLabel} role="button">
      <Link to={route}>
        <div style={{ display: 'inline-block', paddingRight: '5px' }}>{icon}</div>
        {label}
      </Link>
    </div>
  )
}

export const Header: React.FC<TProps> = ({ host }) => {
  const base = `/hosts/${host?.id}`

  return <div>

    <Paper
      shadow="md"
      id="check"
      mb={5}
      className="md:flex dark:bg-gray-800 mb-5 items-center justify-between px-4 visible py-6">
      <div className="flex items-center text-gray-400">
        <CloudServerIcon size={48}/>
        <p tabIndex={0} className="focus:outline-none text-gray-900 dark:text-gray-100 text-base ml-3">
          <span className="text-3xl">{host?.name}</span> {host && <HostStateBadge host={host}/>}
        </p>
      </div>
      <Group position="center" mt={4} mr={10} className="dark:text-gray-400">
        <div aria-label="tag icon" role="button">
          <Link to={`${base}/queues`}>
            <QueueIcon size={36} style={{ display: 'inline-block' }}/>
            Queues
          </Link>
        </div>
        <div aria-label="bell" role="button">
          <Link to={`${base}/workers`}>
            <WorkerIcon size={36} style={{ display: 'inline-block' }}/>
            Workers
          </Link>
        </div>
        <div aria-label="calendar icon" role="button">
          <Link to={`${base}/overview`}>
            <AnalyticsIcon style={{ display: 'inline-block', paddingRight: '5px' }} />
            Metrics
          </Link>
        </div>
      </Group>
    </Paper>
  </div>;
};

export default Header;
