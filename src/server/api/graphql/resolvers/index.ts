import { hostResolver } from './host';
import { queueResolver } from './queue';
import { jobResolver } from './job';
import { ruleResolver } from './rule';
import { appInfoResolver } from './appInfo';
import typeResolvers from './types';

export const resolvers = [
  appInfoResolver,
  hostResolver,
  queueResolver,
  jobResolver,
  ruleResolver,
  typeResolvers,
];
