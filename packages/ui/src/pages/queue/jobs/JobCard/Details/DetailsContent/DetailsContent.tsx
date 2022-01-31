import React from 'react';
import { TabsType } from 'src/hooks/useDetailsTabs';
import { Highlight } from 'src/components/Highlight/Highlight';
import { JobLogs } from './JobLogs/JobLogs';
import type { Job, JobFragment } from 'src/types';

interface DetailsContentProps {
  job: Job | JobFragment;
  selectedTab: TabsType;
}

function stringify(data: any) {
  if (typeof data === 'object') {
    const { __typename, ...rest } = data;
    data = rest;
  }
  return JSON.stringify(data, null, 2);
}

export const DetailsContent = ({
  selectedTab, job }: DetailsContentProps) => {
  const { stacktrace, data, returnvalue, opts, failedReason } = job;

  switch (selectedTab) {
    case 'Data':
      return (
        <Highlight language="json">{stringify({ data, returnvalue }) }</Highlight>
      );
    case 'Options':
      return <Highlight language="json">{stringify(opts)}</Highlight>;
    case 'Error':
      return (
        <>
          {stacktrace.length === 0 ? (
            <div className="error">{!!failedReason ? `${failedReason}` : 'NA'}</div>
          ) : (
            <Highlight language="stacktrace" key="stacktrace">
              {stacktrace.join('\n')}
            </Highlight>
          )}
        </>
      );
    case 'Logs':
      return <JobLogs job={job} />;
    default:
      return null;
  }
};
