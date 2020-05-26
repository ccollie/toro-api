export const QUEUE_BASED_EVENTS = [
  'paused',
  'resumed',
  'drained',
  'cleaned',
  'error',
];

export const JOB_STATES = [
  'completed',
  'waiting',
  'active',
  'failed',
  'removed',
  'delayed',
  'progress',
];

export const isFinishedStatus = (status): boolean =>
  ['completed', 'failed', 'removed'].includes(status);
