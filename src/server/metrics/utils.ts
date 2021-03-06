import { isString } from 'lodash';
import { MetricTypeName, MetricTypes, Predicate } from '@src/types';

export function createJobNameFilter(
  jobNames?: string | string[],
): Predicate<string> {
  if (!jobNames) {
    return () => true;
  } else if (isString(jobNames)) {
    return (name: string) => name === jobNames;
  } else if (jobNames.length === 0) {
    return () => true;
  } else if (jobNames.length === 1) {
    return (name: string) => name === jobNames[0];
  }
  return (name: string) => !!name && jobNames.includes(name);
}

export const metricNameByEnum: Record<MetricTypes, MetricTypeName> = {
  [MetricTypes.None]: 'None', //
  [MetricTypes.Apdex]: 'Apdex',
  [MetricTypes.ConnectedClients]: 'ConnectedClients',
  [MetricTypes.Completed]: 'Completed',
  [MetricTypes.CompletedRate]: 'CompletedRate',
  [MetricTypes.ConsecutiveFailures]: 'ConsecutiveFailures',
  [MetricTypes.ActiveJobs]: 'ActiveJobs',
  [MetricTypes.CurrentCompletedCount]: 'CurrentCompletedCount',
  [MetricTypes.DelayedJobs]: 'DelayedJobs',
  [MetricTypes.CurrentFailedCount]: 'CurrentFailedCount',
  [MetricTypes.ErrorRate]: 'ErrorRate',
  [MetricTypes.ErrorPercentage]: 'ErrorPercentage',
  [MetricTypes.Failures]: 'Failures',
  [MetricTypes.Finished]: 'Finished',
  [MetricTypes.FragmentationRatio]: 'FragmentationRatio',
  [MetricTypes.JobRate]: 'JobRate',
  [MetricTypes.Latency]: 'Latency',
  [MetricTypes.UsedMemory]: 'UsedMemory',
  [MetricTypes.PeakMemory]: 'PeakMemory',
  [MetricTypes.PendingCount]: 'PendingCount',
  [MetricTypes.InstantaneousOps]: 'InstantaneousOps',
  [MetricTypes.Waiting]: 'Waiting',
  [MetricTypes.WaitingChildren]: 'WaitingChildren',
  [MetricTypes.WaitTime]: 'WaitTime',
};
