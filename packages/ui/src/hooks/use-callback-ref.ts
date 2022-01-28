// Source: chakra-ui
import React, { useLayoutEffect } from 'react';

/**
 * React hook to persist any value between renders,
 * but keeps it up-to-date if it changes.
 *
 * @param fn
 */
export function useCallbackRef<T extends (...args: any[]) => any | Promise<any>>(
  fn: T | undefined,
): T {
  const ref = React.useRef(fn);

  useLayoutEffect(() => {
    ref.current = fn;
  });

  return React.useCallback(((...args) => ref.current?.(...args)) as T, []);
}
