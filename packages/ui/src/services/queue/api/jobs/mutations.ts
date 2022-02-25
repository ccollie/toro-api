import { FetchResult } from '@apollo/client';
import { client } from '@/providers/ApolloProvider';
import type {
  Job,
  MetricFragment,
  BulkStatusItem,
  CreateJobMutation,
  DeleteBulkJobsMutation,
  DeleteRepeatableJobByKeyMutation,
  PromoteBulkJobsMutation,
  RetryBulkJobsMutation,
  Status,
} from '@/types';
import {
  CreateJobDocument,
  DeleteBulkJobsDocument,
  DeleteJobDocument,
  DeleteRepeatableJobByKeyDocument,
  DiscardJobDocument,
  MoveJobToCompletedDocument,
  MoveJobToFailedDocument,
  PromoteBulkJobsDocument,
  PromoteJobDocument,
  Queue,
  RetryBulkJobsDocument,
  RetryJobDocument,
} from '@/types';

function evictJobs(queueId: string, ids: string[]): void {
  const cache = client.cache;
  cache.modify({
    id: cache.identify({
      __typename: 'Queue',
      id: queueId,
    }),
    fields: {
      jobs(existingRefs: any[], { readField }) {
        const items: any[] = existingRefs || [];
        return items.filter((item) => {
          const id = readField<string>('id', item) ?? '';
          return !ids.includes(id);
        });
      },
    },
  });
}

function updateStatus(jobId: string, state: Status): void {
  const cache = client.cache;
  cache.modify({
    id: cache.identify({
      __typename: 'Job',
      id: jobId,
    }),
    fields: {
      state() {
        return state;
      },
    },
  });
}

function checkError(result: FetchResult<unknown>): void {
  if (result.errors) {
    if (result.errors.length === 1) {
      throw new Error(result.errors[0].message);
    }
    throw new AggregateError(result.errors);
    // throw new Error(result.errors.map((e) => e.message).join('\n'));
  }
}

export async function createJob(
  queueId: Queue['id'],
  jobName: string,
  data: Record<string, any>,
  opts: Record<string, any>
): Promise<MetricFragment> {
  return client
    .mutate({
      mutation: CreateJobDocument,
      variables: {
        queueId,
        jobName,
        data,
        options: opts,
      },
    })
    .then((value: FetchResult<CreateJobMutation>) => {
      checkError(value);
      return value.data?.createJob as MetricFragment;
    });
}

export async function deleteJob(queueId: string, jobId: Job['id']): Promise<void> {
  await client
    .mutate({
      variables: { queueId, jobId },
      mutation: DeleteJobDocument,
      update() {
        evictJobs(queueId, [jobId]);
      },
    })
    .then((value) => {
      checkError(value);
    });
}

export async function moveJobToCompleted(queueId: string, jobId: Job['id']): Promise<void> {
  await client
    .mutate({
      variables: { queueId, jobId },
      mutation: MoveJobToCompletedDocument,
      update() {
        updateStatus(jobId, 'completed');
      },
    })
    .then((value) => {
      checkError(value);
    });
}

export async function moveJobToFailed(queueId: string, jobId: Job['id']): Promise<void> {
  await client
    .mutate({
      variables: { queueId, jobId },
      mutation: MoveJobToFailedDocument,
      update() {
        updateStatus(jobId, 'failed');
      },
    })
    .then((value) => {
      checkError(value);
    });
}

export async function discardJob(queueId: string, jobId: Job['id']): Promise<void> {
  await client
    .mutate({
      variables: { queueId, jobId },
      mutation: DiscardJobDocument,
    })
    .then((value) => {
      checkError(value);
      const status = value.data?.discardJob?.job?.state;
      if (status) {
        updateStatus(jobId, status as Status);
      }
    });
}

export function bulkDeleteJobs(
  queueId: string,
  jobIds: Array<Job['id']>
): Promise<BulkStatusItem[]> {
  return client
    .mutate({
      variables: { queueId, jobIds },
      mutation: DeleteBulkJobsDocument,
    })
    .then((value: FetchResult<DeleteBulkJobsMutation>) => {
      checkError(value);
      const items = (value.data?.bulkDeleteJobs?.status || []) as BulkStatusItem[];
      const removed = items.filter((x) => x.success).map((x) => x.id);
      evictJobs(queueId, removed);
      return items;
    });
}

export async function retryJob(queueId: string, jobId: Job['id']): Promise<void> {
  await client
    .mutate({
      variables: { queueId, jobId },
      mutation: RetryJobDocument,
    })
    .then((value) => {
      checkError(value);
      const state = value.data?.retryJob?.job?.state;
      if (state) {
        updateStatus(jobId, state as Status);
      }
    });
}

export function bulkRetryJobs(queueId: string, jobIds: string[]): Promise<BulkStatusItem[]> {
  return client
    .mutate({
      variables: { queueId, jobIds },
      mutation: RetryBulkJobsDocument,
    })
    .then((value: FetchResult<RetryBulkJobsMutation>) => {
      checkError(value);
      return (value.data?.bulkRetryJobs?.status || []) as BulkStatusItem[];
    });
}

export async function promoteJob(queueId: string, jobId: Job['id']): Promise<void> {
  await client
    .mutate({
      variables: { queueId, jobId },
      mutation: PromoteJobDocument,
    })
    .then(checkError);
}

export function bulkPromoteJobs(queueId: string, jobIds: string[]): Promise<BulkStatusItem[]> {
  return client
    .mutate({
      variables: { queueId, jobIds },
      mutation: PromoteBulkJobsDocument,
    })
    .then((value: FetchResult<PromoteBulkJobsMutation>) => {
      checkError(value);
      return (value.data?.bulkPromoteJobs?.status || []) as BulkStatusItem[];
    });
}

export function deleteRepeatableJobByKey(queueId: string, key: string): Promise<void> {
  return client
    .mutate({
      variables: { queueId, key },
      mutation: DeleteRepeatableJobByKeyDocument,
    })
    .then((value: FetchResult<DeleteRepeatableJobByKeyMutation>) => {
      checkError(value);
    });
}
