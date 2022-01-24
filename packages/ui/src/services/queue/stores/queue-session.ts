import { StorageConfig } from 'src/config';
import type { Queue, Status } from 'src/types';
import createStore from 'zustand';
import { persist } from 'zustand/middleware';

// Store preferences/session data related to queues
type TState = {
  getQueueStatus: (id: Queue['id']) => Status;
  selectedStatuses: Record<Queue['id'], Status>;  // these need to be in their own store
  setQueueStatus: (id: string, status: Status) => void;
  removeQueueStatus: (id: string) => void;
};

export const useQueueSessionStore = createStore<TState>(
  persist(
    (set, get) => ({
      selectedStatuses: {},
      getQueueStatus(id: Queue['id']): Status {
        return get().selectedStatuses[id] || 'active';
      },
      setQueueStatus: (id, status) => {
        set(state => ({
          ...state,
          selectedStatuses: {
            ...state.selectedStatuses,
            [id]: status,
          },
        }));
      },
      removeQueueStatus: (id) => {
        const statuses = get().selectedStatuses || {};
        if (statuses[id]) {
          delete statuses[id];
          set({ selectedStatuses: statuses });
        }
      },
    }),
    {
      name: `${StorageConfig.persistNs}queue-session`,
    }
  )
);
