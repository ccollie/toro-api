import { getListDiff } from '@/lib/list-differ';
import type { Queue, QueueHost } from '@/types';
import { GetHostByIdDocument, GetHostQueuesDocument, GetHostsAndQueuesDocument } from '@/types';
import type { Draft } from 'immer';
import { getApolloClient } from '@/services/apollo-client';
import createStore from 'zustand';
import { immerize } from './immer';

export type THostState = {
  hosts: QueueHost[];
  getHosts(): Promise<QueueHost[]>;
  getHost(id: QueueHost['id']): Promise<QueueHost | undefined>;
  setHosts: (hosts: QueueHost[]) => void;
  updateHosts: (hosts: QueueHost[]) => void;
  addHost: (item: QueueHost) => void;
  findHost: (id: QueueHost['id']) => QueueHost | undefined;
  removeHost: (id: string) => void;
  addQueue(hostId: string, queue: Queue): boolean;
  findQueue: (id: string) => Queue | undefined;
  getHostQueues(id: QueueHost['id']): Promise<Queue[]>;
  updateQueue: (
    id: string,
    update: Partial<Omit<Queue, 'id' | 'hostId'>>,
  ) => Queue;
  removeQueue(id: string): Queue | undefined;
  updateHost: (id: string, delta: Partial<Omit<QueueHost, 'id'>>) => boolean;
};

export const useStore = createStore<THostState>(
  immerize(
    (set, get) => ({
      hosts: [],
      setHosts(hosts: QueueHost[]) {
        set(draft => draft.hosts = hosts);
      },
      addHost(host: QueueHost) {
        set((draft) => {
          if (!draft.hosts.find((x) => x.id === host.id)) {
            draft.hosts.push(host);
          }
        });
      },
      removeHost(id: string) {
        set(draft => {
          const index = draft.hosts.findIndex((y) => y.id === id);
          if (index >= 0) {
            draft.hosts.splice(index, 1);
          }
        });
      },
      _findQueue(id: string): {
        queue: Queue | undefined;
        hostIndex: number;
        queueIndex: number;
      } {
        if (!id)
          return {
            queue: undefined,
            hostIndex: -1,
            queueIndex: -1,
          };
        const { hosts } = get();
        let queue: Queue | undefined;
        let queueIndex = -1;
        let hostIndex = -1;
        for (let i = 0; i < hosts.length && !queue; i++) {
          const host = hosts[i];
          queueIndex = host.queues?.findIndex((x) => x.id == id) ?? -1;
          if (queueIndex >= 0) {
            hostIndex = i;
            queue = host.queues[queueIndex];
          }
        }
        return {
          queue,
          queueIndex,
          hostIndex,
        };
      },
      _updateHostQueues(host: QueueHost | string, queues: Queue[]): Queue[] {
        const { hosts } = get();
        const id = typeof host === 'string' ? host : host.id;
        const hostIndex = hosts.findIndex((x) => x.id === id);
        if (hostIndex >= 0) {
          set((draft) => {
            const host = draft.hosts[hostIndex];
            const diff = getListDiff(host.queues, queues, (x) => x.id);
            const { added, removed, updated } = diff;

            added.length && host.queues.push(...added);
            removed.forEach((x) => {
              const index = host.queues.findIndex((y) => y.id === x.id);
              if (index >= 0) {
                host.queues.splice(index, 1);
              }
            });
            updated.forEach((x) => {
              const index = host.queues.findIndex((y) => y.id === x.id);
              if (index >= 0) {
                Object.assign(host.queues[index], x);
              }
            });
          });
          return get().hosts[hostIndex].queues;
        }
        return [];
      },
      async getHosts(): Promise<QueueHost[]> {
        const client = getApolloClient();
        const res = await client
          .query({
            query: GetHostsAndQueuesDocument,
          });
        const hosts = (res.data?.hosts ?? []) as QueueHost[];
        get().updateHosts(hosts);
        return get().hosts;
      },
      async getHost(id: QueueHost['id']): Promise<QueueHost | undefined> {
        const { hosts } = get();
        const index = hosts.findIndex((x) => x.id === id);
        const client = getApolloClient();
        const res = await client
          .query({
            query: GetHostByIdDocument,
            variables: {
              id,
            },
          });
        const hostData = res.data?.host as unknown as QueueHost;
        if (hostData) {
          if (index >= 0) {
            set((draft) => {
              const oldHost = draft.hosts[index];
              Object.assign(oldHost, hostData);
            });
          } else {
            set((draft) => {
              draft.hosts.push(hostData);
            });
          }
          return hostData;
        }
        return undefined;
      },
      async getHostQueues(id: QueueHost['id']): Promise<Queue[]> {
        const { hosts } = get();
        const host = hosts.find((x) => x.id === id);
        if (!host) return [];
        const client = getApolloClient();
        const res = await client
          .query({
            query: GetHostQueuesDocument,
            variables: { id },
            fetchPolicy: 'network-only',
          });
        const { data } = res;
        const queues = (data?.host?.queues ?? []) as Queue[];
        return (get() as any)._updateHostQueues(host, queues);
      },
      findQueue(id: string): Queue | undefined {
        const { queue } = (get() as any)._findQueue(id);
        return queue;
      },
      addQueue(hostId: string, queue: Queue): boolean {
        const { hosts } = get();
        const hostIndex = hosts.findIndex((x) => x.id === hostId);
        if (hostIndex < 0) return false;
        const host = hosts[hostIndex];
        const queues = host.queues || [];
        const current = queues.find((x) => x.id === queue.id);
        if (!current) {
          queues.push(queue);
          (get() as any)._updateHostQueues(host, queues);
        }
        return !current;
      },
      removeQueue(id: string): Queue | undefined {
        let res: Queue | undefined = undefined;
        set((draft) => {
          const { queue, hostIndex, queueIndex } = findQueue(draft, id);
          if (queue) {
            res = queue;
            const host = draft.hosts[hostIndex];
            host.queues.splice(queueIndex, 1);
          }
        });
        return res;
      },
      updateQueue(
        id: string,
        update: Partial<Omit<Queue, 'id' | 'hostId'>>,
      ): Queue {
        const {
          queue: found,
          hostIndex,
          queueIndex,
        } = (get() as any)._findQueue(id);
        if (found) {
          set((draft) => {
            const host = draft.hosts[hostIndex];
            const queue = host.queues[queueIndex];
            Object.assign(queue, update);
          });
        }
        return found;
      },
      findHost(id: string): QueueHost | undefined {
        const { hosts } = get();
        return hosts.find((x) => x.id === id);
      },
      updateHosts(hosts: QueueHost[]): void {
        const { hosts: current, updateHost } = get();
        const diff = getListDiff(current, hosts, (x) => x.id);
        const { added, removed, updated } = diff;

        set((draft) => {
          if (added.length) {
            draft.hosts.push(...added);
          }
          removed.forEach((x) => {
            const index = draft.hosts.findIndex((y) => y.id === x.id);
            if (index >= 0) {
              draft.hosts.splice(index, 1);
            }
          });
          updated.forEach((x) => {
            updateHost(x.id, x);
          });
        });
      },
      updateHost(id: string, delta: Partial<Omit<QueueHost, 'id'>>): boolean {
        let result = false;
        let _queues: Queue[] = [];
        set((draft) => {
          const idx = draft.hosts.findIndex((x) => x.id === id);
          if (idx >= 0) {
            result = true;
            const host = draft.hosts[idx];
            const { queues = [], ...hostOnly } = delta;
            Object.assign(host, hostOnly);
            _queues = queues;
          }
        });

        (get() as any)._updateHostQueues(id, _queues);
        return result;
      },
    })
  )
);

function findQueue(state: Draft<THostState>, id: string): {
  queue: Queue | undefined;
  hostIndex: number;
  queueIndex: number;
} {
  if (!id)
    return {
      queue: undefined,
      hostIndex: -1,
      queueIndex: -1,
    };
  const hosts = state.hosts;
  let queue: Queue | undefined;
  let queueIndex = -1;
  let hostIndex = -1;
  for (let i = 0; i < hosts.length && !queue; i++) {
    const host = hosts[i];
    queueIndex = host.queues?.findIndex((x) => x.id == id) ?? -1;
    if (queueIndex >= 0) {
      hostIndex = i;
      queue = host.queues[queueIndex];
    }
  }
  return {
    queue,
    queueIndex,
    hostIndex,
  };
}
