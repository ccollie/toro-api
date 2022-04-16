import type { Job, JobFragment, RepeatableJob } from '@/types';
import { JobState } from '@/types';
import { parseJSON } from 'date-fns';
import { DEFAULT_JOB_NAME } from '@/constants';

type PossiblyDate = Date | number | string | null;

function subtract(later: PossiblyDate, previous: PossiblyDate): number {
  const last = later ? parseJSON(later) : new Date();
  if (!previous) return 0;
  const first = parseJSON(previous);
  return last.getTime() - first.getTime();
}

export function isJobFailed(job: JobFragment | Job): boolean {
  const { stacktrace = [], failedReason = null } = job;
  return !!failedReason || (Array.isArray(stacktrace) && stacktrace.length > 0);
}

export function isJobFinished(job: Job | JobFragment): boolean {
  if (!job) return false;
  if (job.state) {
    return (job.state === JobState.Completed || job.state === JobState.Failed);
  }
  return (
    job.returnvalue !== undefined ||
    !!job.stacktrace?.length ||
    !!job.finishedOn
  );
}

export function normalizeJobName(
  job: Job | JobFragment | RepeatableJob,
): string {
  const name = job.name + '';
  return name.length === 0 || name === DEFAULT_JOB_NAME ? '--' : name;
}

// Job display
export function getJobDuration(job: Job | JobFragment): number {
  if (job.finishedOn) {
    return subtract(job.finishedOn, job.processedOn);
  } else if (job.state === JobState.Active) {
    if (job.processedOn) {
      const processedOn = parseJSON(job.processedOn);
      return Date.now() - processedOn.getTime();
    }
  }
  return 0;
}

export function getJobWaitTime(job: Job | JobFragment): number {
  const wait = subtract(job.processedOn, job.timestamp);
  return Math.min(wait, 0);
}
