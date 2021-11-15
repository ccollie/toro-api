import { JobOptionsSchema } from '@alpen/core';
import { FieldConfig } from '../index';

export const jobOptionsSchema: FieldConfig = {
  description: 'Returns the JSON Schema for the BullMq JobOptions type',
  type: 'JSONSchema!',
  resolve() {
    return {
      ...JobOptionsSchema,
    };
  },
};
