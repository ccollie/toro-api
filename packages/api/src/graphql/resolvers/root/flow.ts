/*

export interface NodeOpts {
  queueName: string;
  prefix?: string;
  id: string;
  depth?: number;
  maxChildren?: number;
}
 */
import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../index';
import { schemaComposer } from 'graphql-compose';
import { JobNodeTC } from '../flow/model/jobNode';
import { JobNode, NodeOpts } from 'bullmq';
import { FlowNodeGetInput } from '../../typings';

export const FlowNodeGetInputTC = schemaComposer.createInputTC({
  name: 'FlowNodeGetInput',
  description: 'Input type for fetching a flow',
  fields: {
    host: {
      type: 'String!',
      description: 'The host to search',
    },
    queueName: {
      type: 'String!',
      description: 'The queue in which the root is found',
    },
    prefix: {
      type: 'String',
      description: 'Queue prefix',
    },
    id: {
      type: 'String!',
      description: 'The id of the job that is the root of the tree or subtree',
    },
    depth: {
      type: 'Int',
      description: 'The maximum depth to traverse',
      defaultValue: 10,
    },
    maxChildren: {
      type: 'Int',
      description: 'The maximum number of children to fetch per level',
      defaultValue: 20,
    },
  },
});

export const flow: FieldConfig = {
  type: JobNodeTC,
  description: 'Load a flow',
  args: {
    input: FlowNodeGetInputTC.NonNull,
  },
  async resolve(
    _,
    { input }: { input: FlowNodeGetInput },
    { accessors }: EZContext,
  ): Promise<JobNode> {
    const { host, ...rest } = input;
    const opts: NodeOpts = {
      ...rest,
    };

    const mgr = accessors.getHost(host);
    return mgr.getFlow(opts);
  },
};
