import createStore from 'zustand';
import { persist } from 'zustand/middleware';
import { StorageConfig } from '@/config/storage';
import { ColorScheme } from '@mantine/core';

interface TState {
  isDarkMode: boolean;
  colorScheme: ColorScheme;
  toggleDarkMode: () => void;
  setScheme: (scheme: ColorScheme) => void;
}

export const useThemeStore = createStore<TState>(
    persist(
      (set, get) => ({
        colorScheme: 'light',
        get isDarkMode(): boolean {
          return get().colorScheme === 'dark';
        },
        set isDarkMode(value: boolean) {
          set(state => {
            state.colorScheme = value ? 'dark' : 'light';
          });
        },
        toggleDarkMode: () => {
          set(state => {
            state.isDarkMode = !state.isDarkMode;
          });
        },
        setScheme(scheme: ColorScheme) {
          set({ colorScheme: scheme });
        },
      }),
      {
        name: `${StorageConfig.persistNs}theme`,
      }
    )
  );
