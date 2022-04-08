import { JobCounts, JobSearchStatus, Queue } from '@/types';

export function queueListsEqual(a: Queue[], b: Queue[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  const setA = new Set(a.map(q => q.id));
  const notFound = a.find(q => !setA.has(q.id));
  return !notFound;
}

export function calcJobCountTotal(counts: JobCounts, status?: JobSearchStatus): number {
  let total = 0;
  if (status) {
    total = parseInt((counts as any)[status], 10);
  } else {
    Object.keys(counts).forEach(key => {
      const v = parseInt((counts as any)[key], 10);
      if (Number.isFinite(v)) total += v;
    });
  }
  if (isNaN(total)) total = 0;
  return total;
}

const RegexRegex  = /(?:[^[/\\]|\\.|\[(?:[^\]\\]|\\.)*\])+/;

// we could check that chars exist in a particular set, but Redis
// keys are binary safe
export function isValidJobIdPattern(pattern: string): boolean {
  if (!pattern) {
    return false;
  }

  return RegexRegex.test(pattern);
}
