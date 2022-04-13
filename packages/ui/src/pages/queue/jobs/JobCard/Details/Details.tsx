import React, { useEffect, useState } from 'react';
import { TabsType, useDetailsTabs } from 'src/pages/queue/jobs/hooks/useDetailsTabs';
import { isJobFailed } from 'src/lib';
import s from './Details.module.css';
import { DetailsContent } from './DetailsContent/DetailsContent';
import { Tabs } from '@mantine/core';
import type { Job, JobFragment, JobSearchStatus } from 'src/types';

interface DetailsProps {
  job: Job | JobFragment;
  status: JobSearchStatus;
}

export const Details = ({ status, job }: DetailsProps) => {
  const isFailed = isJobFailed(job);
  const { tabs } = useDetailsTabs(status, isFailed);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedTab, setSelectedTab] = useState<TabsType>('Data');
  const [firstPass, setFirstPass] = useState(false);

  function getTab(status: JobSearchStatus): TabsType {
    if (status === 'completed') {
      return 'Return Value';
    }
    return (status === 'failed') ? 'Error' : 'Data';
  }

  function getTabIndex(status: JobSearchStatus): number {
    const tab = getTab(status);
    return tabs.findIndex(t => t.title === tab);
  }

  function handleTabClick(index: number, tabKey: TabsType) {
    setActiveTab(index);
    setSelectedTab(tabKey);
  }

  useEffect(() => {
    if (!firstPass) {
      setFirstPass(true);
      setActiveTab(getTabIndex(status));
      setSelectedTab(getTab(status));
    }
  }, [status, tabs]);

  if (!tabs.length) {
    return null;
  }

  return (
    <div className={s.details}>
      <Tabs variant="pills" active={activeTab} onTabChange={handleTabClick}>
        {tabs.map(({ title }) => (
          <Tabs.Tab key={title} tabKey={title} label={title} />
        ))}
      </Tabs>
      <div className={s.tabContent}>
        <div>
          <DetailsContent selectedTab={selectedTab} job={job} />
        </div>
      </div>
    </div>
  );
};
