import React from 'react';
import { Route } from 'react-location';
import Home from '@/pages/home/Home';
import {
  HostOverview,
  Workers as HostWorkers,
  Queues as HostQueues
} from '@/pages/hosts/host';
import HostsHome from '@/pages/hosts/HostsPage';
import Jobs from '@/pages/queue/jobs/List';
import QueueHome from '@/pages/queue/QueueHome';
import ScheduledJobs from '@/pages/queue/ScheduledJobs';
import Workers from '@/pages/queue/Workers';
import { useStore } from '@/stores/hosts';
import type { LocationGenerics } from '@/types';

export function useRouteBuilder(): Route<LocationGenerics>[] {
  const getHosts = useStore(x => x.getHosts);

  // todo: register/unregister
// Build our routes. We could do this in our component, too.
  const routes: Route<LocationGenerics>[] = [
    {
      path: '/',
      element: <Home />,
      loader: async () => {
        return {
          hosts: await getHosts(),
        };
      },
    },
    {
      path: 'dashboard',
      element: <HostsHome />,
      loader: async () => {
        return {
          hosts: await getHosts(),
        };
      },
    },
    {
      path: 'hosts/:hostId/workers',
      element: <HostWorkers />,
    },
    {
      path: 'hosts/:hostId/queues',
      element: <HostQueues/>,
    },
    {
      path: 'hosts/:hostId',
      element: <HostOverview />
    },
    {
      path: 'hosts',
      element: <HostsHome />,
      loader: async () => {
        return {
          hosts: await getHosts(),
        };
      }
    },
    {
      path: 'queues',
      children: [
        {
          path: ':queueId',
          element: <QueueHome />,
          children: [
            { path: 'workers', element: <Workers /> },
            { path: 'jobs', element: <Jobs /> },
            { path: 'scheduled-jobs', element: <ScheduledJobs /> },
          ]
        }
      ]
    }
  ];

  return routes;
}
