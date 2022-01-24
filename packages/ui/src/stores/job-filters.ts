import {
  CreateJobFilterDocument,
  DeleteJobFilterDocument,
  GetJobFiltersDocument,
  UpdateJobFilterDocument
} from '@/types';
import type { GetJobFiltersQuery, JobFilter, UpdateJobFilterInput, Queue } from '@/types';
import { randomId } from '@/lib';
import { useApolloClient } from '@apollo/client';
import { StorageConfig } from '@/config';
import createStore from 'zustand';
import { persist } from 'zustand/middleware';

type QueueId = Queue['id'];

type JobFilterStore = {
  filters: { [key: QueueId]: JobFilter[] };
  history: { [key: QueueId]: JobFilter[] };
  loading: boolean;
  findInStore: (id: string) => JobFilter | undefined;
  getQueueHistory: (queueId: QueueId) => JobFilter[];
  addFilterToHistory(queueId: QueueId, filter: string | JobFilter): JobFilter;
  removeFromHistory(queueId: QueueId, id: string): boolean;
  getFilters(queueId: string, ids?: string[]): Promise<JobFilter[]>;
  createFilter: (queueId: string, name: string, expression: string) => Promise<JobFilter>;
  updateFilter: (queueId: string, id: string, delta: Partial<JobFilter>) => Promise<void>;
  deleteFilter: (queueId: string, id: string) => Promise<boolean>;
};

export const useJobFilterStore = createStore<JobFilterStore>(
  persist(
    (set, get) => ({
      filters: {},
      history: {},
      loading: false,
      findInStore: (id: string): JobFilter | undefined => {
        const filters = get().filters;
        for (const queueId in filters) {
          const filter = filters[queueId]?.find((filter) => filter.id === id);
          if (filter) {
            return filter;
          }
        }
        return undefined;
      },
      getQueueHistory: (queueId: QueueId): JobFilter[] => {
        const { history } = get();
        let filters = history[queueId];
        if (!filters) {
          set({
            history: {
              ...history,
              [queueId]: []
            }
          });
          filters = get().history[queueId];
        }
        return filters;
      },
      addFilterToHistory(queueId: QueueId, filter: string | JobFilter): JobFilter {
        const { history } = get();
        const queueFilters = history[queueId] || [];
        if (typeof filter === 'string') {
          const expr = filter + '';
          const found = queueFilters.find((query) => query.expression === expr);
          if (found) {
            return found;
          }
          filter = {
            name: '',
            id: randomId(),
            expression: expr,
            createdAt: new Date(),
          } as JobFilter;
        } else {
          const f = filter as JobFilter; // quiet type checker
          const found = queueFilters.find(x => x.expression === f.expression || x.id === f.id);
          if (found) {
            return found;
          }
        }
        const filters = [filter, ...queueFilters];
        while (filters.length > 20) filters.pop();
        set({
          history: {...history, [queueId]: filters}
        });
        return filter;
      },
      removeFromHistory(queueId: QueueId, id: string): boolean {
        const { history } = get();
        const queries = history[queueId] || [];
        const count = queries.length;
        const items = [...queries].filter(x => x.id !== id);
        if (count != items.length) {
          set( {
            history: { ... history, [queueId]: items }
          });
          return true;
        }
        return false;
      },
      async getFilters(queueId: string, ids?: string[]): Promise<JobFilter[]> {
        const client = useApolloClient();
        const { errors, data: { queue } } = await client
          .query<GetJobFiltersQuery>({
            query: GetJobFiltersDocument,
            variables: {
              queueId,
              ids,
            },
          });

        if (errors) {
          throw new Error(errors[0].message);
        }

        const items = (queue?.jobFilters || []) as JobFilter[];
        if (ids?.length) {
          const queueFilters = [...get().filters[queueId]] || [];
          for(const item of items) {
            const found = queueFilters.find(x => x.id === item.id);
            if (found) {
              Object.assign(found, item);
            } else {
              queueFilters.push(item);
            }
          }
        } else {
          set( { filters: { [queueId]: items } } );
        }
        return items;
      },
      async createFilter(queueId: string, name: string, expression: string): Promise<JobFilter> {
        const client = useApolloClient();

        set({ loading: true } );
        const { errors, data } = await client
          .mutate({
            variables: { input: { queueId, name, expression } },
            mutation: CreateJobFilterDocument,
          }).finally(() => {
            set({ loading: false } );
          });

        if (errors) {
          throw Error(errors[0].message);
        }

       const filter = data?.createJobFilter as JobFilter;
        if (!filter) {
          throw Error('Failed to create filter');
        }
        const filters = get().filters;
        const items = [...(filters[queueId] || [])];
        items.unshift(filter);
        set({ filters: { ...filters, [queueId]: items } } );
        return filter;
      },
      async updateFilter(queueId: string, id: string, delta: Partial<JobFilter>) {
        const client = useApolloClient();
        const { __typename, id: _id, expression= '', ...rest } = delta;
        if (expression === '') {
          throw Error('Expression is required');
        }
        const input: UpdateJobFilterInput = {
          filterId: id,
          queueId,
          expression,
          ...rest,
        };
        const { errors, data } = await client
          .mutate({
            variables: {
              input,
            },
            mutation: UpdateJobFilterDocument,
          });
        if (errors) {
          throw Error(errors[0].message);
        }
        const res = data?.updateJobFilter;
        if (!res || !res.isUpdated) {
          throw Error('Failed to update filter');
        }
        if (res.isUpdated && res.filter) {
          const filter = res.filter as JobFilter;
          const filters = get().filters;
          const items = [...(filters[queueId] || [])];
          const index = items.findIndex(x => x.id === id);
          if (index >= 0) {
            Object.assign(items[index], filter);
          } else {
            items.unshift(filter);
          }
          set({ filters: { ...filters, [queueId]: items } } );
        }
      },
      async deleteFilter(queueId: string, id: string): Promise<boolean> {
        // todo: move to api layer
        const client = useApolloClient();

        const { errors, data } = await client
          .mutate({
            variables: { input: { queueId, filterId: id } },
            mutation: DeleteJobFilterDocument,
          })

        if (errors) {
          // todo: toast
          return false;
        }
        const deleted = !!data?.deleteJobFilter.isDeleted
        const { filters }  = get();
        const queueFilters = filters[queueId];
        const idx = queueFilters?.findIndex(filter => filter.id === id);
        if (idx !== undefined && idx !== -1) {
          const filtered = [...queueFilters].splice(idx, 1);
          const updated = { ...filters, [queueId]: filtered };
          set({ filters: updated });
        }
        return deleted;
      }
    }),
    {
      name: `${StorageConfig.persistNs}job-filters`,
      version: 1,
    }
  )
);
