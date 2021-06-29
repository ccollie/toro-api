import { isString } from 'lodash';

import { Predicate } from '@src/types';

export function createJobNameFilter(
  jobNames?: string | string[],
): Predicate<string> {
  if (!jobNames) {
    return () => true;
  } else if (isString(jobNames)) {
    return (name: string) => name === jobNames;
  } else if (jobNames.length === 0) {
    return () => true;
  } else if (jobNames.length === 1) {
    return (name: string) => name === jobNames[0];
  }
  return (name: string) => !!name && jobNames.includes(name);
}
