import { useEffect, useState } from 'react';
import type { JobState } from '@/types';

const regularItems = ['Data', 'Options', 'Logs'] as const;

export type TabsType = typeof regularItems[number] | 'Error';

export function useDetailsTabs(currentStatus: JobState, isJobFailed: boolean) {
  const [tabs, updateTabs] = useState<TabsType[]>([]);
  const [selectedTabIdx, setSelectedTabIdx] = useState(0);
  const selectedTab = tabs[selectedTabIdx];

  useEffect(() => {
    const nextState: TabsType[] =
      (currentStatus === 'failed') || isJobFailed
        ? ['Error', ...regularItems]
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
