import type {
  CleanQueueMutation,
  DeleteJobSchemaMutation,
  DeleteQueueMutation,
  DrainQueueMutation,
  GetHostsAndQueuesQuery,
  GetJobSchemaQuery,
  GetQueueByIdQuery,
  InferJobSchemaQuery,
  JobOptionsInput,
  JobSchema,
  PauseQueueMutation,
  Queue,
  ResumeQueueMutation,
  SetJobSchemaMutation,
  UnregisterQueueMutation,
} from '@/types';
import {
  CleanQueueDocument,
  DeleteJobSchemaDocument,
  DeleteQueueDocument,
  DrainQueueDocument,
  GetHostsAndQueuesDocument,
  GetJobSchemaDocument,
  GetQueueByIdDocument,
  GetQueueJobCountsDocument,
  InferJobSchemaDocument,
  JobState,
  PauseQueueDocument,
  ResumeQueueDocument,
  SetJobSchemaDocument,
  UnregisterQueueDocument,
} from '@/types';
import { client } from '@/providers/ApolloProvider';
import { ApolloCache, ApolloError, FetchResult } from '@apollo/client';

export function updateCached<T>(
  cache: ApolloCache<T>,
  id: string,
  update: Record<string, any>,
): void {
  let queue;
  try {
    queue = cache.readQuery({
      query: GetQueueByIdDocument,
      variables: { id },
    });
  } catch {
    return;
  }

  const data = {
    ...update,
  };

  if (queue) {
    cache.writeQuery({
      query: GetQueueByIdDocument,
      variables: { id },
      data,
    });
  }
}

export function removeQueueFromCache<T = any>(
  cache: ApolloCache<T>,
  queueId: string,
): void {
  let hostId: string | null = null;
  try {
    const data = cache.readQuery<GetQueueByIdQuery>({
      query: GetQueueByIdDocument,
      variables: { id: queueId },
    });
    const queue = data?.queue || null;
    hostId = queue?.id || null;
  } catch {
    return;
  }
  if (queueId) {
    cache.evict({
      id: cache.identify({ __typename: 'Queue', id: queueId }),
    });
  }
  if (hostId) {
    const idToRemove = '';
    cache.modify({
      id: cache.identify({ __typename: 'QueueHost', id: hostId }),
      fields: {
        queues(existingRefs: any[], { readField }) {
          return existingRefs.filter(
            (queueRef) => idToRemove !== readField('id', queueRef),
          );
        },
      },
    });
  }
}

export function addQueueToCache(cache: ApolloCache<any>, queue: Queue): void {
  // We use an update function here to write the
  // new value of the query.
  const existingItems = cache.readQuery<GetHostsAndQueuesQuery>({
    query: GetHostsAndQueuesDocument,
  });

  if (existingItems && queue && queue.hostId) {
    const oldValues = existingItems.hosts || [];
    // find the host it belongs to
    const host = oldValues.find((host) => host.id === queue.hostId);
    if (host) {
      cache.modify({
        id: cache.identify(host),
        fields: {
          queues(existingRefs: any[]) {
            return [...existingRefs, queue];
          },
        },
      });
    }
  }
}

export function pauseQueue(id: Queue['id']): Promise<boolean> {
  return client
    .mutate({
      mutation: PauseQueueDocument,
      variables: { id },
      update: (cache: ApolloCache<PauseQueueMutation>, payload) => {
        const isPaused = !!payload.data?.pauseQueue.isPaused;
        updateCached(cache, id, { isPaused });
      },
      refetchQueries: [
        {
          query: GetQueueJobCountsDocument,
          variables: { id },
        },
      ],
    })
    .then((result) => {
      return !!result.data?.pauseQueue.isPaused;
    });
}

export const resumeQueue = (id: Queue['id']): Promise<boolean> => {
  return client
    .mutate<ResumeQueueMutation>({
      mutation: ResumeQueueDocument,
      variables: { id },
      update: (cache: ApolloCache<ResumeQueueMutation>, result) => {
        const isPaused = !!result.data?.resumeQueue?.isPaused;
        updateCached(cache, id, { isPaused });
      },
      refetchQueries: [
        {
          query: GetQueueJobCountsDocument,
          variables: { id },
        },
      ],
    })
    .then((value) => {
      return !!value.data?.resumeQueue.isPaused;
    });
};

export const deleteQueue = (id: Queue['id']): Promise<number> => {
  return client
    .mutate<DeleteQueueMutation>({
      mutation: DeleteQueueDocument,
      variables: { id },
      update: (cache) => {
        removeQueueFromCache(cache, id);
      },
    })
    .then((value: FetchResult<DeleteQueueMutation>) => {
      return value.data?.deleteQueue.deletedJobCount || 0;
    });
};

export const unregisterQueue = (id: Queue['id']): Promise<boolean> => {
  return client
    .mutate<UnregisterQueueMutation>({
      mutation: UnregisterQueueDocument,
      variables: {
        queueId: id,
      },
      update: (cache) => {
        removeQueueFromCache(cache, id);
      },
    })
    .then((value: FetchResult<UnregisterQueueMutation>) => {
      return !!value.data?.unregisterQueue.isRemoved;
    });
};

export function cleanQueue(
  id: Queue['id'],
  grace: number,
  limit?: number,
  status?: JobState,
): Promise<number> {
  const input = {
    id,
    grace,
    limit: limit || 0,
    status: status || JobState.Completed,
  };

  return client
    .mutate<CleanQueueMutation>({
      mutation: CleanQueueDocument,
      variables: input,
    })
    .then((value: FetchResult<CleanQueueMutation>) => {
      return value.data?.cleanQueue?.count || 0;
    });
}

export function drainQueue(id: Queue['id'], delayed?: boolean): Promise<Queue> {
  const input = {
    id,
    delayed: !!delayed,
  };

  return client
    .mutate<DrainQueueMutation>({
      mutation: DrainQueueDocument,
      variables: input,
    })
    .then((value: FetchResult<DrainQueueMutation>) => {
      return value.data?.drainQueue.queue as Queue;
    });
}

export const getJobSchema = (
  queueId: Queue['id'],
  jobName: string,
): Promise<JobSchema> => {
  return client
    .query<GetJobSchemaQuery>({
      query: GetJobSchemaDocument,
      variables: { queueId, jobName },
    })
    .then((result) => {
      if (result.error) throw result.error;
      return result.data?.queueJobSchema as JobSchema;
    });
};

export const inferJobSchema = (
  queueId: Queue['id'],
  jobName: string,
): Promise<JobSchema> => {
  return client
    .query<InferJobSchemaQuery>({
      query: InferJobSchemaDocument,
      variables: { queueId, jobName },
    })
    .then((result) => {
      if (result.error) throw result.error;
      return result.data?.inferJobSchema as JobSchema;
    });
};

export function deleteJobSchema(
  queueId: Queue['id'],
  jobName: string,
): Promise<void> {
  return client
    .mutate({
      mutation: DeleteJobSchemaDocument,
      variables: {
        queueId,
        jobName,
      },
    })
    .then((result: FetchResult<DeleteJobSchemaMutation>) => {
      if (result.errors) {
        throw new ApolloError({
          graphQLErrors: result.errors,
        });
      }
    });
}

export function setJobSchema(
  queueId: Queue['id'],
  jobName: string,
  schema: Record<string, any>,
  options?: Partial<JobOptionsInput>,
): Promise<JobSchema> {
  return client
    .mutate({
      mutation: SetJobSchemaDocument,
      variables: {
        queueId,
        jobName,
        schema,
        defaultOpts: options,
      },
    })
    .then((result: FetchResult<SetJobSchemaMutation>) => {
      const { errors, data } = result;
      if (errors) {
        throw new ApolloError({
          graphQLErrors: errors,
        });
      }
      const { schema, defaultOpts } = data?.setJobSchema || {};
      const res: JobSchema = {
        jobName,
        schema,
        defaultOpts,
      };
      return res;
    });
}
