import { Job, Queue } from 'bullmq';
import { getQueueById } from '../helpers';
import { Scripts } from '../../commands/scripts';

// Try really hard to efficiently get state. Hacky, indeed
export async function getState(job: Job): Promise<string> {
  const result = (job as any).state;
  if (!result) {
    let queue = (job as any).queue as Queue;
    if (!queue) {
      const queueId = (job as any).queueId;
      queue = getQueueById(queueId);
    }
    return Scripts.getJobState(queue, job.id);
  }
  return result;
}
