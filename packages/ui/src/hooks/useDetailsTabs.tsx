import { useEffect, useState } from 'react';
import type { Status } from '@/types';

const regularItems = ['Data', 'Options', 'Logs'] as const;

export type TabsType = typeof regularItems[number] | 'Error';

export function useDetailsTabs(currentStatus: Status, isJobFailed: boolean) {
  const [tabs, updateTabs] = useState<TabsType[]>([]);
  const [selectedTabIdx, setSelectedTabIdx] = useState(0);
  const selectedTab = tabs[selectedTabIdx];

  useEffect(() => {
    const nextState: TabsType[] =
      currentStatus === 'failed'
        ? ['Error', ...regularItems]
        : isJobFailed
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
