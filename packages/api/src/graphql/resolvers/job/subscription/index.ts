import { createStateSubscription } from './subscribeToJob';
import { JobStatusEnum } from '@alpen/core/queues';

export { onJobAdded } from './onJobAdded';
export { onJobUpdated } from './onJobUpdated';
export { onJobProgress } from './onJobProgress';
export { onJobRemoved } from './onJobRemoved';
export { onJobLogAdded } from './onJobLogAdded';

export * from './onJobDelayed';
export const obJobActive = createStateSubscription(JobStatusEnum.ACTIVE);
export const obJobFailed = createStateSubscription(JobStatusEnum.FAILED);
export const obJobCompleted = createStateSubscription(JobStatusEnum.COMPLETED);
export const obJobStalled = createStateSubscription(JobStatusEnum.STALLED);
