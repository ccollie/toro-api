import React from 'react';
import { TabsType } from 'src/hooks/useDetailsTabs';
import { Highlight } from 'src/components/Highlight/Highlight';
import { JobLogs } from 'src/pages/queue/jobs/JobCard/Details/DetailsContent/JobLogs/JobLogs';
import type { Job as AppJob, JobFragment } from 'src/types';

interface DetailsContentProps {
  job: AppJob | JobFragment;
  selectedTab: TabsType;
  getJobLogs: () => Promise<string[]>;
}

export const DetailsContent = ({
  selectedTab,
  job: { stacktrace, data, returnvalue, opts, failedReason },
  getJobLogs,
}: DetailsContentProps) => {
  switch (selectedTab) {
    case 'Data':
      return (
        <Highlight language="json">{JSON.stringify({ data, returnvalue }, null, 2)}</Highlight>
      );
    case 'Options':
      return <Highlight language="json">{JSON.stringify(opts, null, 2)}</Highlight>;
    case 'Error':
      return (
        <>
          {stacktrace.length === 0 ? (
            <div className="error">{!!failedReason ? failedReason : 'NA'}</div>
          ) : (
            <Highlight language="stacktrace" key="stacktrace">
              {stacktrace.join('\n')}
            </Highlight>
          )}
        </>
      );
    case 'Logs':
      return <JobLogs getJobLogs={getJobLogs} />;
    default:
      return null;
  }
};
