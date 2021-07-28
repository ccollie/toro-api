import { processDynamo } from './dynamo';
import { processS3 } from './s3';
import { Job } from 'bullmq';

export const process = async (job: Job): Promise<any> => {
  if (job.name === 's3') {
    return processS3(job);
  } else if (job.name === 'dynamo') {
    return processDynamo(job);
  }

  throw new Error(`Unknown job type "${job.name}" in queue`);
};
