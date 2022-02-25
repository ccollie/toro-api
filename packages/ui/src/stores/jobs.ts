import type { MetricFragment } from 'src/types';
import createStore from 'zustand';

type TState = {
  selected: Set<string>;
  data: MetricFragment[];
  selectedCount: number;
  selectedJobs: MetricFragment[];
  isSelected: (id: JobOrId) => boolean;
  selectJob: (job: JobOrId) => void;
  selectJobs: (ids: Array<JobOrId>) => void;
  unselectJob: (job: JobOrId) => void;
  toggleSelectJob: (job: JobOrId) => void;
  setJobs: (jobs: MetricFragment[]) => void;
  removeJob: (job: string | MetricFragment) => void;
  clear: () => void;
};

type JobOrId = MetricFragment | string;

export const useJobsStore = createStore<TState>((set, get) => ({
  selected: new Set(),
  data: [],
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
  isSelected: (job: JobOrId) => get().selected.has(getId(job)),
  selectJob: (job: JobOrId) => {
    const id = getId(job);
    set({
      selected: new Set(get().selected).add(id),
    });
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
  removeJob: (job: string | MetricFragment) => {
    const { data, selected } = get();
    const id = getId(job);
    const newSelected = new Set(selected);
    newSelected.delete(id);
    const idx = data.findIndex(x => x.id === id);
    if (idx > -1) {
      const newData = [...data].splice(idx, 1);
      set({
        data: newData,
      });
    }
    set({ selected: newSelected });
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
  setJobs(jobs: MetricFragment[]) {
    const { selected } = get();
    // check if items and current selection are in sync
    // for example when removing item
    const newSelection = new Set(selected);
    const newIds = new Set(jobs.map(x => x.id));
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
}));

function getId(job: string | MetricFragment): string {
  return typeof job === 'string' ? job : job.id;
}
