import { FieldConfig } from '../../index';
import { JobNodeTC } from '@server/graphql/resolvers/flow/model/jobNode';
import { FlowAddInput } from '@server/graphql/typings';
import { FlowJob, JobNode } from 'bullmq';
import { schemaComposer } from 'graphql-compose';
import { getHost } from '@server/graphql/helpers';

import { JobOptionsTC } from '@server/graphql/resolvers/job/model/Job.opts';

const FlowJobOptionsInputTC = JobOptionsTC.getITC()
  .clone('FlowJobOptionsInput')
  .removeField('parent');

export const FlowJobInputTC = schemaComposer.createInputTC({
  name: 'FlowJobInput',
  description: 'TODO: fill in description',
  fields: {
    name: {
      type: 'String!',
    },
    prefix: {
      type: 'String',
      description: 'Prefix of queue',
    },
    queueName: {
      type: 'String!',
      description: 'The queue to create the job in',
    },
    data: {
      type: 'JSONObject',
      description: 'Data for the job',
    },
    opts: FlowJobOptionsInputTC,
    children: {
      type: '[FlowJobInput!]',
    },
  },
});

export const flowAdd: FieldConfig = {
  type: JobNodeTC.NonNull,
  args: {
    input: schemaComposer.createInputTC({
      name: 'FlowAddInput',
      fields: {
        host: {
          type: 'String!',
          description: 'The host to which to add the flow',
        },
        job: FlowJobInputTC.NonNull,
      },
    }),
  },
  resolve: async (_, { input }: { input: FlowAddInput }): Promise<JobNode> => {
    const { host, job } = input;
    const flowJob: FlowJob = {
      ...job,
    };
    const mgr = getHost(host);
    return mgr.addFlow(flowJob);
  },
};
