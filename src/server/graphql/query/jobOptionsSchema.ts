import { JobsOptionsSchema } from '../../queues';
import { FieldConfig } from '../types';
import { GraphQLJSONSchema } from '../types/scalars';

export const jobOptionsSchema: FieldConfig = {
  description: 'Returns the JSON Schema for the BullMq JobOptions type',
  type: GraphQLJSONSchema,
  resolve() {
    return JobsOptionsSchema;
  },
};
