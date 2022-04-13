import { FindJobsByFilterOptions } from '@alpen/core';
import { ApolloQueryResult } from '@apollo/client';
import { client } from '@/providers/ApolloProvider';
import {
  FindJobsDocument,
  GetJobLogsDocument,
  GetJobsByFilterDocument,
  GetQueueJobsDocument,
  GetRepeatableJobsDocument,
  JobSearchStatus, Maybe,
  SortOrderEnum,
} from '@/types';
import type {
  FilteredJobsResult,
  FindJobsInput,
  FindJobsQuery,
  GetQueueJobsQuery,
  GetJobsByFilterQuery,
  GetRepeatableJobsQuery,
  JobCounts,
  JobFragment,
  JobLogs,
  RepeatableJob,
} from '@/types';

export function getJobs(
  queueId: string,
  status: Maybe<JobSearchStatus>,
  page = 1,
  pageSize = 10,
  sortOrder: SortOrderEnum = SortOrderEnum.Desc,
) {
  const offset = (page - 1) * pageSize;
  const limit = pageSize;
  return client
    .query({
      query: GetQueueJobsDocument,
      variables: {
        queueId,
        status: status ?? undefined,
        offset,
        limit,
        sortOrder,
      },
      fetchPolicy: 'network-only',
    })
    .then((results: ApolloQueryResult<GetQueueJobsQuery>) => {
      // todo: handle error
      if (results.error) throw results.error;
      const base = results.data?.queue;
      const jobs = (base?.jobs || []) as JobFragment[];
      const { __typename, ...counts } = base?.jobCounts as JobCounts;
      return {
        jobs,
        counts,
      };
    });
}

export function findJobs({
  queueId,
  status,
  expression,
  cursor,
  scanCount,
}: FindJobsInput): Promise<{ nextCursor: string | null; jobs: JobFragment[] }> {
  return client
    .query<FindJobsQuery>({
      query: FindJobsDocument,
      variables: {
        id: queueId,
        status,
        criteria: expression,
        cursor,
        scanCount,
      },
      fetchPolicy: 'network-only',
    })
    .then((results) => {
      const { data, error } = results;
      if (error) throw error;
      const searchResult = data?.queue?.jobsByFilter;
      const jobs = (searchResult?.jobs || []) as JobFragment[];
      const nextCursor = searchResult?.cursor || null;
      return {
        jobs,
        nextCursor,
      };
    });
}

export function getJobsByFilter(
  queueId: string,
  {
    status = JobSearchStatus.Completed,
    cursor,
    filter,
    count,
  }: FindJobsByFilterOptions,
): Promise<FilteredJobsResult> {
  count = count ?? 10;
  return client
    .query<GetJobsByFilterQuery>({
      query: GetJobsByFilterDocument,
      variables: {
        id: queueId,
        status,
        cursor,
        count,
        criteria: filter,
      },
      fetchPolicy: 'network-only',
    })
    .then((results: ApolloQueryResult<GetJobsByFilterQuery>) => {
      // todo: handle error
      if (results.error) throw results.error;
      const base = results.data?.queue;
      const searchResult = base?.jobsByFilter;
      const jobs = (searchResult?.jobs || []) as JobFragment[];
      const counts = base?.jobCounts as JobCounts;
      const cursor = searchResult?.cursor || undefined;
      return {
        jobs,
        cursor,
        counts,
        current: searchResult?.current ?? 0,
        total: searchResult?.total ?? 0,
        hasNext: !!(cursor && cursor.length),
      };
    });
}

export function getJobLogs(
  queueId: string,
  jobId: string,
  start = 0,
  end = -1,
): Promise<JobLogs> {
  return client
    .query({
      query: GetJobLogsDocument,
      variables: {
        queueId,
        id: jobId,
        start,
        end,
      },
    })
    .then((res) => {
      if (res.error) throw res.error;
      return res.data?.job.logs as JobLogs;
    });
}

export function getRepeatableJobs(queueId: string, page = 1, pageSize = 10) {
  const offset = (page - 1) * pageSize;
  const limit = pageSize;
  return client
    .query<GetRepeatableJobsQuery>({
      query: GetRepeatableJobsDocument,
      variables: {
        id: queueId,
        offset,
        limit,
      },
    })
    .then((results) => {
      // todo: handle error
      const { data, error } = results;
      if (error) throw error;
      const base = data?.queue;
      const jobs = (base?.repeatableJobs || []) as RepeatableJob[];
      const count = base?.repeatableJobCount || 0;
      return {
        jobs,
        count,
      };
    });
}
