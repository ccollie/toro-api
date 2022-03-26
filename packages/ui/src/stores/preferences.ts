import { StorageConfig } from 'src/config';
import type { JobState, Queue } from 'src/types';
import createStore from 'zustand';
import { persist } from 'zustand/middleware';

type PreferencesState = {
  pageSize: number;
  confirmDangerousActions: boolean;
  selectedStatuses: Record<Queue['id'], JobState>;  // these need to be in their own store
  getQueueStatus: (id: Queue['id']) => JobState;
  setQueueStatus: (id: Queue['id'], status: JobState) => void;
  removeQueueStatus: (id: Queue['id']) => void;
  changeConfirmDangerousActions: (value: boolean) => void;
  toggleConfirmDangerousActions: () => void;
};

export const usePreferencesStore = createStore<PreferencesState>(
  persist(
    (set, get) => ({
      pageSize: 10,
      selectedStatuses: {},
      confirmDangerousActions: true,
      getQueueStatus: (id: string) => get().selectedStatuses[id] || 'completed',
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
      changeConfirmDangerousActions: (confirmDangerousActions: boolean) =>
        set({ confirmDangerousActions }),
      toggleConfirmDangerousActions: () =>
        set((state) => ({
          confirmDangerousActions: !state.confirmDangerousActions,
        })),
    }),
    {
      name: `${StorageConfig.persistNs}prefs`,
    }
  )
);
