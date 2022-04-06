import { JobSearchStatus } from '@alpen/core';
import { JobType } from 'bullmq';

// this is used within a resolver, so the value passed in is already
// validated
export function convertJobType(val: string): JobType | undefined {
  if (!val) {
    return undefined;
  }
  switch (val) {
    case 'waiting_children':
      return 'waiting-children';
    default:
      return val as JobType;
  }
}

// this is used within a resolver, so the value passed in is already
// validated
export function convertJobSearchStatus(val: string): JobSearchStatus | undefined {
  if (!val) {
    return undefined;
  }
  if (val === 'waiting_children') {
    return 'waiting-children';
  } else {
    return val as JobSearchStatus;
  }
}
