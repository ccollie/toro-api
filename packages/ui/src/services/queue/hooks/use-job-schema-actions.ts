import type { JobSchema, JobSchemaActions } from '@/types';
import {
  deleteJobSchema,
  getJobNames,
  getJobOptionsSchema,
  getJobSchema,
  getJobSchemas,
  inferJobSchema,
  setJobSchema,
} from '../api';
import { useQueue } from '@/hooks';

export function useJobSchemaActions(queueId: string): JobSchemaActions {
  const { updateQueue } = useQueue(queueId);
  return {
    deleteSchema(jobName: string): Promise<void> {
      return deleteJobSchema(queueId, jobName);
    },
    getJobNames(): Promise<string[]> {
      return getJobNames(queueId).then((data) => {
        updateQueue({
          jobNames: data ?? [],
        });
        return data;
      });
    },
    getJobOptionsSchema(): Promise<Record<string, any>> {
      return getJobOptionsSchema();
    },
    getSchema(jobName: string): Promise<JobSchema | null> {
      return getJobSchema(queueId, jobName);
    },
    inferSchema(jobName: string): Promise<JobSchema | null> {
      return inferJobSchema(queueId, jobName);
    },
    getSchemas(): Promise<JobSchema[]> {
      return getJobSchemas(queueId);
    },
    setSchema(jobName: string, schema: JobSchema): Promise<JobSchema> {
      const opts = schema.defaultOpts ?? undefined;
      return setJobSchema(queueId, jobName, schema, opts);
    },
  };
}
