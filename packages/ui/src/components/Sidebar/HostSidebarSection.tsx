import React from 'react';
import { QueueHost } from '@/types';
import { useMatchRoute } from 'react-location';
import SidebarSection from './SidebarSection';

interface HostSidebarSectionProps {
  host: QueueHost;
  className?: string;
  href?: string;
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
}

export const HostSidebarSection: React.FC<HostSidebarSectionProps> = (props) => {
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
        <svg className="shrink-0 h-6 w-6" viewBox="0 0 24 24">
          <path
            className={`fill-current text-gray-400 ${
              isActive && 'text-indigo-300'
            }`}
            d="M13 15l11-7L11.504.136a1 1 0 00-1.019.007L0 7l13 8z"
          />
          <path
            className={`fill-current text-gray-700 ${
              isActive && '!text-indigo-600'
            }`}
            d="M13 15L0 7v9c0 .355.189.685.496.864L13 24v-9z"
          />
          <path
            className={`fill-current text-gray-600 ${
              isActive && 'text-indigo-500'
            }`}
            d="M13 15.047V24l10.573-7.181A.999.999 0 0024 16V8l-11 7.047z"
          />
        </svg>
      }
    />
  );
};

// todo: memoize on id
