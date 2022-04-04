import { HostMetrics, HostPage, HostQueues, HostWorkers } from '@/pages/hosts/host';
import HostsHome from '@/pages/hosts/HostsPage';
import Jobs from '@/pages/queue/jobs/List';
import QueueHome from '@/pages/queue/QueueHome';
import ScheduledJobs from '@/pages/queue/ScheduledJobs';
import Workers from '@/pages/queue/Workers';
import { useStore } from '@/stores/hosts';
import type { LocationGenerics, Queue } from '@/types';
import React from 'react';
import { Route } from '@tanstack/react-location';

export function useRouteBuilder(): Route<LocationGenerics>[] {
  const getHosts = useStore(x => x.getHosts);
  const findQueue = useStore(x => x.findQueue);
  const findHost = useStore(x => x.findHost);

async function ensureQueue(id: Queue['id']): Promise<Queue | undefined> {
  let queue = findQueue(id);
  if (!queue) {
    await getHosts();
    queue = findQueue(id);
  }
  return queue;
}

// todo: register/unregister
// Build our routes. We could do this in our component, too.
  return [
    {
      path: '/',
      element: <HostsHome/>,
      loader: async () => {
        return {
          hosts: await getHosts(),
        };
      },
    },
    {
      path: 'dashboard',
      element: <HostsHome/>,
    },
    {
      path: 'hosts',
      children: [
        {
          path: ':hostId',
          element: <HostPage/>,
          loader: async ({ params: { hostId } }) => {
            return {
              // todo: throw if not found
              host: findHost(hostId),
            };
          },
          children: [
            {path: 'workers', element: <HostWorkers/>},
            {path: 'queues', element: <HostQueues/>},
            {path: 'metrics', element: <HostMetrics/>},
          ]
        }
      ]
    },
    {
      path: 'queues',
      children: [
        {
          path: ':queueId',
          element: <QueueHome/>,
          loader: async ({ params: { queueId } }) => {
            return {
              queue: await ensureQueue(queueId),
            };
          },
          children: [
            {path: 'workers', element: <Workers/>},
            {path: 'jobs', element: <Jobs/>},
            {path: 'scheduled-jobs', element: <ScheduledJobs/>},
          ]
        }
      ]
    }
  ];
}
