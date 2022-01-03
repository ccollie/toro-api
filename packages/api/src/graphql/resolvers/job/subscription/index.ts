import { createStateSubscription } from './subscribeToJob';

export { onJobAdded } from './onJobAdded';
export { onJobUpdated } from './onJobUpdated';
export { onJobProgress } from './onJobProgress';
export { onJobRemoved } from './onJobRemoved';
export { onJobLogAdded } from './onJobLogAdded';

export * from './onJobDelayed';
export const obJobActive = createStateSubscription('active');
export const obJobFailed = createStateSubscription('failed');
export const obJobCompleted = createStateSubscription('completed');
export const obJobStalled = createStateSubscription('stalled');
