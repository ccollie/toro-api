import React from 'react';
import { useDetailsTabs } from 'src/hooks/useDetailsTabs';
import { isJobFailed } from 'src/lib';
import { Button } from 'src/pages/queue/jobs/JobCard/Button/Button';
import s from 'src/pages/queue/jobs/JobCard/Details/Details.module.css';
import { DetailsContent } from './DetailsContent/DetailsContent';
import type { Job as AppJob, JobFragment, Status } from 'src/types';

interface DetailsProps {
  job: AppJob | JobFragment;
  status: Status;
  actions: { getLogs: () => Promise<string[]> };
}

export const Details = ({ status, job, actions }: DetailsProps) => {
  const isFailed = isJobFailed(job);
  const { tabs, selectedTab } = useDetailsTabs(status, isFailed);

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className={s.details}>
      <ul className={s.tabActions}>
        {tabs.map((tab) => (
          <li key={tab.title}>
            <Button onClick={tab.selectTab} isActive={tab.isActive}>
              {tab.title}
            </Button>
          </li>
        ))}
      </ul>
      <div className={s.tabContent}>
        <div>
          <DetailsContent selectedTab={selectedTab} job={job} getJobLogs={actions.getLogs} />
        </div>
      </div>
    </div>
  );
};
