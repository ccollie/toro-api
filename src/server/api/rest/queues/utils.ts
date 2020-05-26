import { getJobTypes, getJobCounts, queueIsPaused } from '../../../models';
import pAll from 'p-all';

export async function getQueueInfo(host, ...queueList) {
  const queues = [].concat(...queueList);

  const calls = [];
  queues.forEach((queue) => {
    calls.push(
      () => getJobCounts(queue),
      () => getJobTypes(host, queue),
      () => queueIsPaused(queue),
    );
  });

  const res = await pAll(calls, { concurrency: 8 });

  const result = [];
  for (let i = 0, j = 0; i < res.length; i += 3, j++) {
    result.push({
      name: queues[j].name,
      counts: res[i],
      jobTypes: res[i + 1],
      isPaused: !!res[i + 2],
    });
  }

  return result;
}
