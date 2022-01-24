import produce from 'immer';
import createStore from 'zustand';
import { persist } from 'zustand/middleware';
import { StorageConfig } from '@/config/storage';
import {
  AllStatuses,
  DefaultQueueFilter,
  isFilterEmpty,
  statusesEqual,
} from '../filters';
import type { Queue, QueueHost, QueueFilter } from '@/types';

type HostId = QueueHost['id'];
type QueueId = Queue['id'];

export type TQueueFiltersState = {
  hosts: Record<string, QueueFilter>;
  ensureHost: (id: HostId) => QueueFilter;
  removeHost: (id: HostId) => void;
  updateHostFilter: (id: HostId, update: Partial<QueueFilter>) => QueueFilter;
  excludeQueue: (hostId: HostId, queueId: QueueId) => void;
  unexcludeQueue: (hostId: HostId, queueId: QueueId) => void;
  selectQueue: (hostId: HostId, queueId: QueueId) => void;
  unselectQueue: (hostId: HostId, queueId: QueueId) => void;
  update: (hostId: HostId, filter: Partial<QueueFilter>) => void;
};

export const useQueueFiltersStore = createStore<TQueueFiltersState>(
  persist(
    (set, get) => ({
      hosts: Object.create(null),
      _findHost(hostId: string): QueueFilter {
        const hosts = get().hosts;
        return hosts[hostId];
      },
      ensureHost(hostId: string): QueueFilter {
        let hosts = get().hosts;
        let found = hosts[hostId];
        if (!found) {
          set(
            produce((draft) => {
              draft.hosts[hostId] = {
                ...DefaultQueueFilter,
              };
            }),
          );
          hosts = get().hosts;
          found = hosts[hostId];
        }
        return found;
      },
      removeHost(id: string) {
        const { hosts } = get();
        if (!hosts[id]) return;
        const update = { ...hosts };
        delete update[id];
        set({ hosts: update });
      },
      _normalize(filter: QueueFilter) {
        if (typeof filter.search === 'string') {
          filter.search = filter.search.trim();
          if (!filter.search) {
            delete filter.search;
          }
        }

        if (Array.isArray(filter.prefixes)) {
          if (filter.prefixes.every((prefix) => !prefix)) {
            delete filter.prefixes;
          }
        }

        if (
          filter.statuses?.length &&
          statusesEqual(filter.statuses, AllStatuses)
        ) {
          delete filter.statuses;
        }

        if (filter.exclude && !filter.exclude.length) {
          delete filter.exclude;
        }
        if (filter.include && !filter.include.length) {
          delete filter.include;
        }
        if (filter.exclude?.length && filter.include?.length) {
          const included = new Set(filter.include);
          for (let i = 0; i < filter.exclude.length; i++) {
            const id = filter.exclude[i];
            if (included.has(id)) {
              filter.exclude.splice(i, 1);
              i--;
            }
          }
        }
      },
      updateHostFilter(id: string, update: Partial<QueueFilter>): QueueFilter {
        const { ensureHost } = get();
        const filter = ensureHost(id);
        Object.assign(filter, update);
        (get() as any)._normalize(filter);
        return (get() as any)._findHost(id);
      },
      excludeQueue(hostId: string, queueId: QueueId) {
        const { ensureHost, updateHostFilter } = get();
        const filter = ensureHost(hostId);
        if (filter.exclude?.includes(queueId)) return;
        const exclude = filter.exclude || [];
        exclude.push(queueId);
        const update: Partial<QueueFilter> = { exclude };
        if (filter.include?.length) {
          const index = filter.include.findIndex((id) => id === queueId);
          if (index >= 0) {
            const include = filter.include.slice();
            include.splice(index, 1);
            update.include = include;
          }
        }
        updateHostFilter(hostId, update);
      },
      selectQueue(hostId: string, queueId: QueueId) {
        const { ensureHost, updateHostFilter } = get();
        const host = ensureHost(hostId);
        const included = host.include ?? [];
        const excluded = host.exclude ?? [];
        if (!included.includes(queueId)) {
          updateHostFilter(hostId, {
            include: [...included, queueId],
            exclude: excluded.filter((x) => x !== queueId),
          });
        }
      },
      unexcludeQueue(hostId: string, queueId: QueueId) {
        const hosts = get().hosts;
        const host = hosts[hostId];
        if (!host) return;
        const excluded = host.exclude ?? [];
        const filtered = excluded.filter((x) => x !== queueId);
        if (excluded.length !== filtered.length) {
          get().updateHostFilter(hostId, { exclude: filtered });
        }
      },
      unselectQueue(hostId: string, queueId: QueueId) {
        const { hosts, updateHostFilter } = get();
        const host = hosts[hostId];
        if (!host) return;
        const included = host.include ?? [];
        const filtered = included.filter((x) => x !== queueId);
        if (included.length !== filtered.length) {
          updateHostFilter(hostId, { include: filtered });
        } else {
          // not in the include list. add to excluded
          const excluded = host.exclude ?? [];
          if (!excluded.includes(queueId)) {
            updateHostFilter(hostId, { exclude: [...excluded, queueId] });
          }
        }
      },
      update(hostId: string, filter: Partial<QueueFilter>) {
        const { updateHostFilter } = get();
        updateHostFilter(hostId, filter);
      },
      isFilterEmpty(hostId: string) {
        const hosts = get().hosts;
        const filter = hosts[hostId];
        return isFilterEmpty(filter);
      },
    }),
    {
      name: `${StorageConfig.persistNs}queues-filter`,
    },
  ),
);

export const activeHostQueueFilterSelector = (state: {
  ensureHost: (arg0: any) => any;
  activeHostId: any;
}) => state.ensureHost(state.activeHostId);
