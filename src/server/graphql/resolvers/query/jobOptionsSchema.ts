import { JobOptionsSchema as schema } from '../../../queues';
import { FieldConfig } from '../index';

export const jobOptionsSchema: FieldConfig = {
  description: 'Returns the JSON Schema for the BullMq JobOptions type',
  type: 'JSONSchema!',
  resolve() {
    return {
      ...schema,
    };
  },
};
