import { JobsOptionsSchema as schema } from '../../queues';
import { FieldConfig } from '../types';

export const jobOptionsSchema: FieldConfig = {
  description: 'Returns the JSON Schema for the BullMq JobOptions type',
  type: 'JSONSchema!',
  resolve() {
    return {
      ...schema,
    };
  },
};
