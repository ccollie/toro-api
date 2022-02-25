import React, { useState } from 'react';
import { TabsType, useDetailsTabs } from 'src/hooks/useDetailsTabs';
import { isJobFailed } from 'src/lib';
import s from './Details.module.css';
import { DetailsContent } from './DetailsContent/DetailsContent';
import { Tabs } from '@mantine/core';
import type { Job, MetricFragment, Status } from 'src/types';

interface DetailsProps {
  job: Job | MetricFragment;
  status: Status;
}

export const Details = ({ status, job }: DetailsProps) => {
  const isFailed = isJobFailed(job);
  const { tabs } = useDetailsTabs(status, isFailed);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedTab, setSelectedTab] = useState<TabsType>(tabs[0]?.title ?? 'Data');

  if (tabs.length === 0) {
    return null;
  }

  function handleTabClick(index: number, tabKey: TabsType) {
    setActiveTab(index);
    setSelectedTab(tabKey);
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
