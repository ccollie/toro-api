import { useEffect } from 'react';
import createStore from 'zustand';
import shallow from 'zustand/shallow';

type TState = {
  isLocked: boolean;

  unlock: () => void;
  lock: () => void;
  toggle: () => void;
};

export const useRefetchJobsLockStore = createStore<TState>((set) => ({
  isLocked: false,

  unlock: () => set({ isLocked: false }),
  lock: () => set({ isLocked: true }),
  toggle: () => set((state) => ({ isLocked: !state.isLocked })),
}));


export const useRunRefetchJobsLockSideEffects = () => {
  const [lock, unlock] = useRefetchJobsLockStore(
    (state) => [state.lock, state.unlock],
    shallow
  );
  useEffect(() => {
    const modalEffect = (isOpen: boolean) => {
      if (isOpen) {
        lock();
      } else {
        unlock();
      }
    };
  }, []);
};
