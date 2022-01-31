import React from 'react';
import { QueueHost } from '@/types';
import { useMatchRoute } from 'react-location';
import { Navbar } from '@mantine/core';

interface HostSidebarSectionProps {
  host: QueueHost;
  className?: string;
  href?: string;
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
}

export const HostSidebarSection: React.FC<HostSidebarSectionProps> = (
  props,
) => {
  const { host, isSidebarOpen, setSidebarOpen } = props;

  const matchRoute = useMatchRoute();
  const href = props.href || `/hosts/${host.id}`;
  const isActive = !!matchRoute({ to: href });

  const items = host.queues.map((queue) => ({
    title: queue.name,
    href: `/queues/${queue.id}`,
  }));

  // todo: need handler for title click
  return <Navbar.Section title={host.name} items={items}></Navbar.Section>;
};

// todo: memoize on id
