import type { JobFragment } from 'src/types';
import createStore from 'zustand';

type TState = {
  selected: Set<string>;
  addJob: (id: string) => void;
  toggleJob: (id: string) => void;
  setJobs: (ids: string[]) => void;
  removeJob: (id: string) => void;
  isSelected: (id: string) => boolean;
  sync: (jobs: JobFragment[]) => void;
  syncIds: (ids: string[]) => void;
  clear: () => void;
};

export const useSelectedJobsStore = createStore<TState>((set, get) => ({
  selected: new Set(),
  setJobs: (ids) =>
    set({
      selected: new Set(ids),
    }),
  addJob: (id) =>
    set({
      selected: new Set(get().selected).add(id),
    }),
  syncIds: (ids: string[]) => {
    // check if items and current selection are in sync
    // for example when removing item
    const selected = get().selected;
    const newSelection = new Set(selected);
    selected.forEach((item) => {
      if (!ids.includes(item)) {
        newSelection.delete(item);
      }
    });
    set({
      selected: newSelection,
    });
  },
  sync: (jobs: JobFragment[]) => {
    // check if items and current selection are in sync
    // for example when removing item
    get().syncIds(jobs.map(x => x.id));
  },
  isSelected: (id: string) => get().selected.has(id),
  toggleJob: (id) => {
    const { selected } = get();
    if (selected.has(id)) {
      selected.delete(id);
      set({ selected: new Set(selected) });
    } else {
      set({
        selected: new Set(selected).add(id),
      });
    }
  },
  removeJob: (id) => {
    const selected = new Set(get().selected);
    selected.delete(id);
    set({ selected });
  },
  clear: () => {
    const { selected } = get();
    if (selected.size > 0) {
      set({
        selected: new Set(),
      });
    }
  },
}));
