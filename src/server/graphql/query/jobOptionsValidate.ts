import { validateJobOptions as validate } from '../../queues';
import { FieldConfig, JobOptionsInputTC } from '../types';
import { JobsOptions } from 'bullmq';
import { schemaComposer } from 'graphql-compose';

export const jobOptionsValidate: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'ValidateJobOptionsPayload',
    fields: {
      isValid: 'Boolean!',
      errors: '[String!]!',
    },
  }),
  description: 'Validate BullMQ job options structure',
  args: {
    input: JobOptionsInputTC.NonNull,
  },
  async resolve(_, { input }) {
    const result = {
      isValid: true,
      errors: [],
    };
    try {
      const opts = (input as any) as JobsOptions;
      validate(opts);
    } catch (err) {
      // todo: better formatting
      result.errors = [err.message ?? err.toString()];
    }

    return result;
  },
};
