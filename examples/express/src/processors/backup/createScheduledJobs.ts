import ms from 'ms';
import { Job, Queue } from 'bullmq';

function addS3BackupJob(queue: Queue): Promise<Job> {
  return queue.add(
    's3',
    {
      bucket: 'lazer-kitties.amazonaws.com',
      queue: queue.name,
    },
    {
      repeat: {
        every: ms('10 mins'),
        tz: 'Asia/Hong_Kong',
      },
    },
  );
}

function addDynamoBackupJob(queue: Queue): Promise<Job> {
  return queue.add(
    'dynamo',
    {
      bucket: 'fungible-kneehighs.amazonaws.com',
      queue: queue.name,
    },
    {
      repeat: {
        every: ms('10 mins'),
        tz: 'America/New_York',
      },
    },
  );
}

export async function createScheduledJobs(queue: Queue): Promise<void> {
  await addS3BackupJob(queue);
  await addDynamoBackupJob(queue);
}
