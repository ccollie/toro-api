import { LayoutConfig } from '@/config/layout';
import { StorageConfig } from '@/config/storage';
import createStore from 'zustand';
import { persist } from 'zustand/middleware';

type TState = {
  isOpen: boolean;
  defaultWidth: number;

  changeDefaultWidth: (defaultWidth: number) => void;
  toggle: () => void;
  open: () => void;
  close: () => void;
};

export const useSidebarState = createStore<TState>(
  persist(
    (set, _get) => ({
      isOpen: false,
      defaultWidth: LayoutConfig.drawerWidth,

      changeDefaultWidth: (defaultWidth) => set({ defaultWidth }),
      toggle: () => set(({ isOpen }) => ({ isOpen: !isOpen })),
      close: () => set({ isOpen: false }),
      open: () => set({ isOpen: true }),
    }),
    {
      name: `${StorageConfig.persistNs}sidebar`,
    }
  )
);
