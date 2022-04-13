import type { JobFragment } from 'src/types';
import createStore from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

type TState = {
  selected: Set<string>;
  data: JobFragment[];
  getJob: (id: JobOrId) => JobFragment | null;
  selectedCount: number;
  selectedJobs: JobFragment[];
  isSelected: (id: JobOrId) => boolean;
  selectJob: (job: JobOrId) => void;
  selectJobs: (ids: Array<JobOrId>) => void;
  selectAll: () => void;
  unselectAll: () => void;
  allSelected: boolean;
  unselectJob: (job: JobOrId) => void;
  toggleSelectJob: (job: JobOrId) => void;
  setJobs: (jobs: JobFragment[]) => void;
  removeJob: (job: string | JobFragment) => void;
  removeJobs: (jobs: Array<JobOrId>) => void;
  clear: () => void;
};

type JobOrId = JobFragment | string;

export const useJobsStore = createStore<TState>(
  subscribeWithSelector((set, get) => ({
    selected: new Set(),
    data: [],
    getJob: (id: JobOrId): JobFragment | null => {
      const { data } = get();
      return data.find(job => job.id === id) ?? null;
    },
    get selectedCount() {
      return get().selected.size;
    },
    selectJobs: (ids: Array<JobOrId>) => {
      const { data } = get();
      const jobIds = new Set(data.map((job) => job.id));
      const filtered = ids.map(getId).filter((id) => jobIds.has(id));
      if (filtered.length) {
        set({
          selected: new Set(filtered),
        });
      }
    },
    selectAll: () => {
      const { data } = get();
      const jobIds = new Set(data.map((job) => job.id));
      set({
        selected: jobIds,
      });
    },
    unselectAll: () => {
      set({
        selected: new Set(),
      });
    },
    isSelected: (job: JobOrId) => get().selected.has(getId(job)),
    get allSelected() {
      const { data, selected } = get();
      const jobCount = data.length;
      return jobCount > 0 && jobCount === selected.size;
    },
    selectJob: (job: JobOrId) => {
      const { selected } = get();
      const id = getId(job);
      if (!selected.has(id)) {
        set({
          selected: new Set([...selected, id]),
        });
      }
    },
    toggleSelectJob: (job: JobOrId) => {
      const { selected } = get();
      const id = getId(job);
      if (selected.has(id)) {
        selected.delete(id);
        set({ selected: new Set(selected) });
      } else {
        set({
          selected: new Set(selected).add(id),
        });
      }
    },
    removeJob: (job: string | JobFragment) => {
      const { data, selected } = get();
      const id = getId(job);
      const idx = data.findIndex((x) => x.id === id);
      if (idx > -1) {
        const newData = [...data];
        newData.splice(idx, 1);
        if (selected.has(id)) {
          const newSelected = new Set(selected);
          newSelected.delete(id);
          set({
            data: newData,
            selected: newSelected,
          });
        } else {
          set({
            data: newData,
          });
        }
      }
    },
    removeJobs(jobs: Array<JobOrId>) {
      const { data, selected } = get();
      const newSelected = new Set(selected);
      const newData = [...data];
      let selectionChanged = false;
      let deleteCount = 0;
      jobs.forEach((job) => {
        const id = getId(job);
        if (selected.has(id)) {
          selectionChanged = true;
          newSelected.delete(id);
        }
        const idx = data.findIndex((x) => x.id === id);
        if (idx > -1) {
          deleteCount++;
          newData.splice(idx, 1);
        }
      });
      if (selectionChanged) {
        set({
          data: newData,
          selected: newSelected,
        });
      } else {
        if (deleteCount > 0) {
          set({
            data: newData,
          });
        }
      }
    },
    unselectJob: (job: JobOrId) => {
      const { selected } = get();
      const id = getId(job);
      if (selected.has(id)) {
        const newSelected = new Set(selected);
        newSelected.delete(id);
        set({ selected: newSelected });
      }
    },
    setJobs(jobs: JobFragment[]) {
      const { selected } = get();
      // check if items and current selection are in sync
      // for example when removing item
      const newSelection = new Set(selected);
      const newIds = new Set(jobs.map((x) => x.id));
      selected.forEach((item) => {
        if (!newIds.has(item)) {
          newSelection.delete(item);
        }
      });
      set({ data: [...jobs] });
      if (newSelection.size != selected.size) {
        set({ selected: newSelection });
      }
    },
    get selectedJobs() {
      const { data, selected } = get();
      return data.filter(({ id }) => selected.has(id));
    },
    clear: () => {
      const { selected, data } = get();
      if (selected.size > 0 || data.length > 0) {
        set({
          selected: new Set(),
          data: [],
        });
      }
    },
  })),
);

function getId(job: string | JobFragment): string {
  return typeof job === 'string' ? job : job.id;
}
