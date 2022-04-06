import { GraphQLEnumType } from 'graphql';

// https://github.com/taskforcesh/bullmq/blob/master/src/types/job-type.ts

export const FinishedStatus = new GraphQLEnumType({
  name: 'FinishedStatus',
  values: {
    completed: { value: 'completed' },
    failed: { value: 'failed' },
  },
});


export const JobState = new GraphQLEnumType({
  name: 'JobState',
  values: {
    completed: { value: 'completed' },
    failed: { value: 'failed' },
    active: { value: 'active' },
    delayed: { value: 'delayed' },
    waiting: { value: 'waiting' },
    // eslint-disable-next-line camelcase
    waiting_children: { value: 'waiting-children' },
    // unknown: { value: 'unknown' },
  },
});


export const JobType = new GraphQLEnumType({
  name: 'JobType',
  values: {
    completed: { value: 'completed' },
    failed: { value: 'failed' },
    active: { value: 'active' },
    delayed: { value: 'delayed' },
    waiting: { value: 'waiting' },
    // eslint-disable-next-line camelcase
    waiting_children: { value: 'waiting-children' },
    paused: { value: 'paused' },
    repeat: { value: 'repeat' },
    wait: { value: 'wait' },
  },
});

export const JobSearchStatus = new GraphQLEnumType({
  name: 'JobSearchStatus',
  values: {
    completed: { value: 'completed' },
    failed: { value: 'failed' },
    active: { value: 'active' },
    delayed: { value: 'delayed' },
    waiting: { value: 'waiting' },
    // eslint-disable-next-line camelcase
    waiting_children: { value: 'waiting-children' },
    paused: { value: 'paused' },
  },
});


// https://github.com/taskforcesh/bullmq/blob/master/docs/gitbook/api/bullmq.queue.clean.md
export const CleanQueueJobType = new GraphQLEnumType({
  name: 'CleanQueueJobType',
  values: {
    completed: { value: 'completed' },
    failed: { value: 'failed' },
    active: { value: 'active' },
    delayed: { value: 'delayed' },
    paused: { value: 'paused' },
    wait: { value: 'wait' },
  },
});
