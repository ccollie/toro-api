import ms = require('ms');
import {
  sleep,
  getRandDistArray,
  getTimestampString,
  formatBytes,
  rand,
} from '../utils';
import { Job } from 'bullmq';

const TABLES = [
  'teams',
  'loot',
  'chat-history',
  'leaderboard',
  'audit',
  'orders',
  'users',
  'transactions',
];

export const processDynamo = async (job: Job): Promise<any> => {
  const { data } = job;
  const { queue, bucket } = data;
  const logMsg = `${
    queue || 'backup'
  }: backing up dynamoDb tables to s3 bucket ${bucket}`;
  console.log(logMsg);

  const update = async (progress, msg): Promise<void> => {
    await job.updateProgress(progress);
    await job.log(msg);
  };

  function getBackupFilename(tableName: string): string {
    const datestamp = getTimestampString();
    return `${tableName}-${datestamp}.tgz`;
  }

  const maybeThrow = function (message: string): void {
    const dice = Math.random();
    if (dice < 0.2) {
      throw new Error(message);
    }
  };

  const totalCount = Math.floor(rand(50, 10000)) * 1000;

  const sizeDistributions = getRandDistArray(TABLES.length, totalCount);

  const maxTime = (totalCount / 1000) * rand(250, 2000);

  const done = (): void => {
    console.log(
      `${queue} : dynamo backup to ${bucket} done ${totalCount} records copied.`,
    );
  };

  let sum = 0;
  for (let i = 0, len = TABLES.length; i < len; i++) {
    const table = TABLES[i];
    const count = sizeDistributions[i];
    const compressedName = getBackupFilename(table);
    const time = Math.floor((count / totalCount) * maxTime);
    maybeThrow(`Error copying table ${table} to ${bucket}`);
    await sleep(time);
    const countStr = formatBytes(count);
    sum = sum + count;
    const progress = Math.floor(sum / totalCount);
    const msg = `copied ${countStr} records from ${table} to ${compressedName} in ${ms(
      time,
    )}`;
    await update(progress, msg);
  }

  done();
};
