import createStore from 'zustand';

type TState = {
  isOpen: boolean;
  hostId: string | undefined;
  close: () => void;
  open: (hostId: string) => void;
};

export const useRedisInfoModalStore = createStore<TState>((set) => ({
  isOpen: false,
  hostId: undefined,
  open: (hostId: string) => set({ isOpen: true, hostId }),
  close: () => set({ isOpen: false, hostId: undefined }),
}));
