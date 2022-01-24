import { Queue } from '@/types';

export function queueListsEqual(a: Queue[], b: Queue[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  const setA = new Set(a.map(q => q.id));
  const notFound = a.find(q => !setA.has(q.id));
  return !notFound;
}
