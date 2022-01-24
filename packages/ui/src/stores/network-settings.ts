import createStore from 'zustand';
import { persist } from 'zustand/middleware';
import { StorageConfig } from '@/config/storage';

type TPollingOption = number;
type TNNetworkSettingsState = {
  pollingInterval: TPollingOption;
  shouldFetchData: boolean;
  textSearchPollingDisabled: boolean;

  toggleShouldFetchData: () => void;
  toggleTextSearchPollingDisabled: () => void;
  changePollingInterval: (pollingInterval: TPollingOption) => void;
};

export const useNetworkSettingsStore = createStore<TNNetworkSettingsState>(
  persist(
    (set, _) => ({
      shouldFetchData: true,
      pollingInterval: 5000,
      textSearchPollingDisabled: true,

      changePollingInterval: (pollingInterval) => set({ pollingInterval }),
      toggleTextSearchPollingDisabled: () =>
        set(({ textSearchPollingDisabled }) =>
          set({ textSearchPollingDisabled: !textSearchPollingDisabled })
        ),
      toggleShouldFetchData: () =>
        set(({ shouldFetchData }) => ({ shouldFetchData: !shouldFetchData })),
    }),
    {
      name: `${StorageConfig.persistNs}network`,
      version: 1,
    }
  )
);
export const getPollingInterval = () => {
  const interval = useNetworkSettingsStore((state) => state.pollingInterval);
  return interval ? interval : false;
};
