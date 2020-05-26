import ms from 'ms';
import { round } from 'lodash';
import {
  sleep,
  getRandDistArray,
  getTimestampString,
  formatBytes,
} from '../utils';

const FILENAMES = [
  'kute-kats.txt',
  'secret-codez.php',
  'master-passwords.txt',
  'request-logs.log',
  'latency-stats.mst',
  'client-stack-trace',
  'transaction-uploads.txt',
];

const ONE_MEG = 1024 * 1000;

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export const processS3 = async (job) => {
  const { data } = job;
  const { queue, bucket } = data;
  const logMsg = `${queue || 'backup'}: backing up s3 bucket ${bucket}`;
  console.log(logMsg);

  const update = async (progress, msg) => {
    await job.updateProgress(progress);
    await job.log(msg);
  };

  function fixFilename(filename: string, ext: string): string {
    const [name, origExt] = filename.split('.');
    const newExt = ext || origExt;
    const suffix = newExt && newExt.length ? `.${newExt}` : '';
    const datestamp = getTimestampString();
    return `${name}-${datestamp}${suffix}`;
  }

  const maybeThrow = (message: string): void => {
    const dice = Math.random();
    if (dice < 0.2) {
      throw new Error(message);
    }
  };

  const done = function (): void {
    console.log(`${queue} : backup ${bucket} done.`);
  };

  const totalSize = rand(50, 100) * ONE_MEG;
  // between 250ms and 1 sec
  const maxCompressionTime = (totalSize / ONE_MEG) * rand(250, 1000);

  const sizeDistributions = getRandDistArray(FILENAMES.length, totalSize);

  // calculated compressed sizes
  const compressedSizes = [];
  let totalCompressedSize = 0;
  for (let i = 0; i < sizeDistributions.length; i++) {
    const compressedSize = Math.floor(rand(0.2, 0.75) * sizeDistributions[i]);
    totalCompressedSize += compressedSize;
    compressedSizes.push(compressedSize);
  }

  let sum = 0;
  for (let i = 0, len = FILENAMES.length; i < len; i++) {
    const filename = FILENAMES[i];
    const origSize = sizeDistributions[i];
    const compressedName = fixFilename(filename, 'tgz');
    const compressedSize = compressedSizes[i];
    const time = Math.floor((origSize / totalSize) * maxCompressionTime);
    maybeThrow(`Error compressing ${filename} to ${compressedName}`);
    await sleep(time);
    const origSizeStr = formatBytes(origSize);
    const compressedSizeStr = formatBytes(compressedSize);
    const percentage = round(compressedSize / origSize, 1);
    sum = sum + origSize;
    const progress = Math.floor(sum / totalSize);
    // eslint-disable-next-line max-len
    let msg = `compressed ${filename} ${percentage}% to ${compressedName} (${origSizeStr} => ${compressedSizeStr})`;
    msg = msg + ` in ${ms(time)}`;
    await update(progress, msg);
  }

  done();
};
