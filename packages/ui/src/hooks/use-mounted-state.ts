import { useEffect, useRef, useCallback } from 'react';

// returns a function that when called will
// return `true` if the component is mounted
export const useMountedState = (): (() => boolean) => {
  const mountedRef = useRef(false);
  const isMounted = useCallback(() => mountedRef.current, []);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return isMounted;
};
