import { FieldConfig } from '../index';
import { BulkJobsOptionsSchema } from '@alpen/core';

export const bulkJobOptionsSchema: FieldConfig = {
  description: 'Returns the JSON Schema for the BullMq BulkJobOptions type',
  type: 'JSONSchema!',
  resolve() {
    return {
      ...BulkJobsOptionsSchema,
    };
  },
};
