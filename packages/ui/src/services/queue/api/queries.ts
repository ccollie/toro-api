import type {
  GetJobOptionsSchemaQuery,
  GetJobSchemasQuery,
  GetQueueByIdQuery,
  GetQueueJobsNamesQuery,
  JobSchema,
  Queue
} from '@/types';
import {
  GetJobOptionsSchemaDocument,
  GetJobSchemasDocument,
  GetQueueByIdDocument,
  GetQueueJobsNamesDocument
} from '@/types';
import { client } from '@/providers/ApolloProvider';

export const getQueueById = (id: Queue['id']): Promise<Queue> => {
  return client
    .query<GetQueueByIdQuery>({
      query: GetQueueByIdDocument,
      variables: { id },
    })
    .then((fetchResult) => {
      if (fetchResult?.error) {
        throw fetchResult?.error;
      }
      return fetchResult?.data?.queue as Queue;
    });
};

export const getJobNames = (id: Queue['id']): Promise<string[]> => {
  return client
    .query<GetQueueJobsNamesQuery>({
      query: GetQueueJobsNamesDocument,
      variables: { id },
    })
    .then((fetchResult) => {
      if (fetchResult?.error) {
        throw fetchResult?.error;
      }
      return fetchResult?.data?.queue?.jobNames ?? [];
    });
};

export const getJobSchemas = (id: Queue['id']): Promise<JobSchema[]> => {
  return client
    .query<GetJobSchemasQuery>({
      query: GetJobSchemasDocument,
      variables: { queueId: id },
    })
    .then((fetchResult) => {
      if (fetchResult?.error) {
        throw fetchResult?.error;
      }
      return fetchResult?.data?.queue?.jobSchemas ?? [];
    });
};

export const getJobOptionsSchema = (): Promise<Record<string, any>> => {
  return client
    .query<GetJobOptionsSchemaQuery>({
      query: GetJobOptionsSchemaDocument,
    })
    .then((result) => {
      if (result?.error) {
        throw result?.error;
      }
      return result?.data?.jobOptionsSchema;
    });
};
