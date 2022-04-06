import type {
  JobCounts,
  JobFragment
} from '@/types';
import { EmptyJobCounts } from 'src/constants';
import create from 'zustand';
import { makeArray } from '@/lib';

interface TJobListState {
  jobCounts: JobCounts;
  expandedRowIds: Set<string>;
  selectedJobIds: Set<string>;
  jobs: Array<JobFragment>;
  selectedJobs: Array<JobFragment>;
  expandedJobs: Array<JobFragment>;
  totalJobs: number;
  selectedCount: number;
  clearJobs: () => void;
  setJobs: (jobs: Array<JobFragment>) => void;
  setJobCounts: (counts: JobCounts) => void;
  setExpanded: (jobId: string | string[], expanded: boolean) => void;
  setSelected: (jobId: string | string[]) => void;
  addSelection: (jobId: string | string[]) => void;
  removeSelection: (jobId: string | string[]) => void;
  isJobExpanded: (job: JobOrId) => boolean;
  isJobSelected: (job: JobOrId) => boolean;
  toggleSelected: (job: JobOrId) => void;
  selectJob: (job: JobOrId) => void;
  removeJobs: (id: string | string[]) => void;
}

type JobOrId = string | JobFragment;

export const useJobsStore = create<TJobListState>((set, get) => ({
  expandedRowIds: new Set<string>(),
  selectedJobIds: new Set<string>(),
  jobs: [],
  jobCounts: {
    active: 0,
    waiting: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
    paused: 0,
  },
  clearJobs() {
    set({
      jobs: [],
      selectedJobIds: new Set<string>(),
      expandedRowIds: new Set<string>(),
    });
  },
  setExpanded(jobId: string | string[], expanded: boolean) {
    const expandedItems = get().expandedRowIds;
    if (expanded) {
      set({
        expandedRowIds: setAdd(expandedItems, jobId),
      });
    } else {
      set({
        expandedRowIds: setRemove(expandedItems, jobId),
      });
    }
  },
  addSelection(jobId: string | string[]) {
    const selectedJobIds = get().selectedJobIds;
    const input = makeArray(jobId);
    const ids = input.filter(id => selectedJobIds.has(id));
    // update only
    if (ids.length !== input.length) {
      set({
        selectedJobIds: new Set<string>(input),
      });
    }
  },
  removeSelection(jobId: string | string[]) {
    const selectedJobIds = get().selectedJobIds;
    set({
      selectedJobIds: setRemove(selectedJobIds, jobId),
    });
  },
  setSelected(jobId: string | string[]) {
    const ids = makeArray(jobId);
    set({
      selectedJobIds: new Set<string>(ids),
    });
  },
  selectJob(job: JobOrId) {
    const jobId = getId(job);
    const selectedJobIds = get().selectedJobIds;
    if (selectedJobIds.has(jobId)) {
      const newSelectedJobIds = new Set(selectedJobIds);
      newSelectedJobIds.add(jobId);
      set({
        selectedJobIds: newSelectedJobIds,
      });
    }
  },
  toggleSelected(job: JobOrId) {
    const { selectedJobIds } = get();
    const id = getId(job);
    if (selectedJobIds.has(id)) {
      set({
        selectedJobIds: setRemove(selectedJobIds, id),
      });
    } else {
      set({
        selectedJobIds: setAdd(selectedJobIds, id),
      });
    }
  },
  removeJobs(ids: string | string[]) {
    ids = makeArray(ids);
    const { jobs, expandedRowIds, selectedJobIds } = get();
    set({
      selectedJobIds: setRemove(selectedJobIds, ids),
      expandedRowIds: setRemove(expandedRowIds, ids),
      jobs: jobs.filter(job => !ids.includes(job.id)),
    });
  },
  isJobExpanded(job: JobOrId): boolean {
    const { expandedRowIds } = get();
    const id = typeof job === 'string' ? job : job.id;
    return expandedRowIds.has(id);
  },
  isJobSelected(job: JobOrId): boolean {
    const { selectedJobIds } = get();
    const id = typeof job === 'string' ? job : job.id;
    return selectedJobIds.has(id);
  },
  setJobs(jobs: Array<JobFragment>) {
    // Note: for our purposes, we modify the array directly
    // to avoid some issues we're investigating with grid re-renders.
    const { selectedJobIds, expandedRowIds, jobs: prev } = get();
    const asSet = new Set<string>(jobs.map(x => x.id));
    // replace all items, keep ref
    prev.length = 0;
    prev.push(...jobs);
    const newSelected = new Set<string>();
    const newExpanded = new Set<string>();
    selectedJobIds.forEach(x => {
      if (asSet.has(x)) newSelected.add(x);
    });
    expandedRowIds.forEach(x => {
      if (asSet.has(x)) newExpanded.add(x);
    });
    const update: any = {};
    if (expandedRowIds.size !== newExpanded.size)
      update.expandedRowIds = newExpanded;
    if (selectedJobIds.size !== newSelected.size)
      update.selectedJobIds = newSelected;
    set({
      ...update,
    });
  },
  setJobCounts(counts: JobCounts) {
    const jobCounts = {
      ...EmptyJobCounts,
      ...counts,
    };
    set({ jobCounts });
  },
  get selectedJobs(): Array<JobFragment> {
    const { jobs, selectedJobIds } = get();
    if (selectedJobIds.size === 0) return [];
    return jobs.filter(job => selectedJobIds.has(job.id));
  },
  get expandedJobs(): Array<JobFragment> {
    const { jobs, expandedRowIds } = get();
    if (expandedRowIds.size === 0) return [];
    return jobs.filter(job => expandedRowIds.has(job.id));
  },
  get totalJobs(): number {
    const counts = get().jobCounts ?? EmptyJobCounts;
    const keys = Object.keys(counts);
    return keys.reduce((acc, key) => acc + (counts as any)[key] ?? 0, 0);
  },
  get selectedCount(): number {
    const { selectedJobIds } = get();
    return selectedJobIds.size;
  },
}));

function getId(job: JobFragment | string): string {
  return typeof job === 'string' ? job : job.id;
}

function setAdd(set: Set<string>, item: string | Array<string>): Set<string> {
  let result = set;
  let found = false;
  makeArray(item).forEach(x => {
    if (!found && !set.has(x)) {
      found = true;
      result = new Set<string>(set);
    }
    result.add(x);
  });
  return result;
}

function setRemove(
  set: Set<string>,
  item: string | Array<string>
): Set<string> {
  let result = set;
  let found = false;
  makeArray(item).forEach(x => {
    if (!found && set.has(x)) {
      found = true;
      result = new Set<string>(set);
    }
    result.delete(x);
  });
  return result;
}
