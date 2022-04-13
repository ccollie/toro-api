import { useEffect, useState } from 'react';
import type { JobSearchStatus } from 'src/types';

const regularItems = ['Data', 'Options', 'Logs', 'Return Value'] as const;

export type TabsType = typeof regularItems[number] | 'Error';

export function useDetailsTabs(currentStatus: JobSearchStatus, isJobFailed: boolean) {
  const [tabs, updateTabs] = useState<TabsType[]>([]);
  const [selectedTabIdx, setSelectedTabIdx] = useState(0);
  const selectedTab = tabs[selectedTabIdx];

  useEffect(() => {
    const nextState: TabsType[] =
      (currentStatus === 'failed') || isJobFailed
        ? [...regularItems, 'Error']
        : [...regularItems];

    updateTabs(nextState);
  }, [currentStatus]);

  return {
    tabs: tabs.map((title, index) => ({
      title,
      isActive: title === selectedTab,
      selectTab: () => setSelectedTabIdx(index),
    })),
    selectedTab,
  };
}
