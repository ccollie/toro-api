import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../utils';
import { JobNodeTC } from '../query/jobNode';
import { FlowJob, JobNode } from 'bullmq';
import { schemaComposer } from 'graphql-compose';

import { JobOptionsTC } from '../../job/query/opts';
import { CreateFlowInput } from '../../../typings';

const FlowJobOptionsInputTC = JobOptionsTC.getITC()
  .clone('FlowJobOptionsInput')
  .removeField('parent');

export const FlowJobInputTC = schemaComposer.createInputTC({
  name: 'FlowJobInput',
  description: 'Values needed to create a FlowJob',
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

export const createFlow: FieldConfig = {
  type: JobNodeTC.NonNull,
  args: {
    input: schemaComposer.createInputTC({
      name: 'CreateFlowInput',
      fields: {
        host: {
          type: 'String!',
          description: 'The host to which to add the flow',
        },
        job: FlowJobInputTC.NonNull,
      },
    }),
  },
  resolve: async (
    _,
    { input }: { input: CreateFlowInput },
    { accessors }: EZContext,
  ): Promise<JobNode> => {
    const { host, job } = input;
    const flowJob: FlowJob = {
      ...job,
    };
    const mgr = accessors.getHost(host);
    return mgr.addFlow(flowJob);
  },
};