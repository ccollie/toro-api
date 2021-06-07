import { BulkJobsOptionsSchema as schema } from '@src/server/queues';
import { FieldConfig } from '../index';

export const bulkJobOptionsSchema: FieldConfig = {
  description: 'Returns the JSON Schema for the BullMq BulkJobOptions type',
  type: 'JSONSchema!',
  resolve() {
    return {
      ...schema,
    };
  },
};
