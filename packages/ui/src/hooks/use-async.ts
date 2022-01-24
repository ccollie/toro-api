import { useMountedState } from './use-mounted-state';
import { useCallback, useState } from 'react';

export enum AsyncState {
  IDLE = 'idle',
  PENDING = 'pending',
  SUCCESS = 'success',
  ERROR = 'error',
}

export const useAsync = (
  asyncFunction: (...args: any[]) => any | void | Promise<void | any>,
) => {
  const [status, setStatus] = useState<AsyncState>(AsyncState.IDLE);
  const [value, setValue] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [called, setCalled] = useState(false);
  const isMounted = useMountedState();

  // The execute function wraps asyncFunction and
  // handles setting state for pending, value, and error.
  // useCallback ensures the below useEffect is not called
  // on every render, but only if asyncFunction changes.
  const execute = useCallback(
    (...args: any[]) => {
      if (isMounted()) {
        setStatus(AsyncState.PENDING);
        setLoading(true);
        setValue(null);
        setError(null);
      }

      return Promise.resolve(asyncFunction(...args))
        .then((response) => {
          if (isMounted()) {
            setValue(response);
            setStatus(AsyncState.SUCCESS);
          }
          return response;
        })
        .catch((error) => {
          if (isMounted()) {
            setError(error);
            setStatus(AsyncState.ERROR);
          }
        })
        .finally(() => {
          if (isMounted()) {
            setLoading(false);
            setCalled(true);
          }
        });
    },
    [asyncFunction],
  );

  return { execute, status, loading, called, value, error };
};
