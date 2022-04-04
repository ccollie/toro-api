import React from 'react';
import { QueueHost } from '@/types';
import { useMatchRoute } from '@tanstack/react-location';
import { CloudServerIcon } from 'src/components/Icons';
import SidebarSection from './SidebarSection';

interface HostSidebarSectionProps {
  host: QueueHost;
  className?: string;
  href?: string;
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
}

export const HostSidebarSection = (props: HostSidebarSectionProps) => {
  const { host, isSidebarOpen, setSidebarOpen } = props;

  const matchRoute = useMatchRoute();
  const href = props.href || `/hosts/${host.id}`;
  const isActive = !!matchRoute( { to: href } );

  const items = host.queues.map((queue) =>({
    title: queue.name,
    href: `/queues/${queue.id}`,
  }));

  // todo: need handler for title click
  return (
    <SidebarSection
      title={host.name}
      href={`/hosts/${host.id}`}
      isSidebarExpanded={isSidebarOpen}
      setSidebarExpanded={setSidebarOpen}
      items={items}
      icon={
        <CloudServerIcon />
      }
    />
  );
};

// todo: memoize on id
