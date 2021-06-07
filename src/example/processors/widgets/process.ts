import { rand } from '../utils';
import { Job } from 'bullmq';
import ms from 'ms';
import { chooseGerund } from './utils';
import { getCatastrophe } from './errors';
import { gaussianBM } from '../latencies';
import { getRandDistArray, getRandomString, sleep } from '../utils';

const options = {
  min: ms('5 secs'),
  max: ms('2 mins'),
  mean: ms('0.5 mins'),
};

function getRuntime(): number {
  return gaussianBM(options.min, options.max);
}

export const process = async (job: Job): Promise<any> => {
  const { data, id } = job;
  const { product, parts, orderNumber, queue } = data;
  const makeTime = Math.floor(getRuntime());

  const logMsg = `${queue} #${orderNumber}: ${product} materializing for ${ms(
    makeTime,
  )}`;
  console.log(logMsg);

  let progress = 0;
  let step = 0;

  const partCount = parts.length;

  const progressValues = getRandDistArray(partCount, 100);

  const update = async (): Promise<void> => {
    const progressMsg = `${chooseGerund()} ${parts[step]}`;
    progress += progressValues[step++];
    await Promise.all([job.updateProgress(progress), job.log(progressMsg)]);
  };

  const maybeThrow = function (): void {
    const dice = Math.random();
    if (dice < 0.065) {
      const msg = getCatastrophe(`${product} ${id}`);
      throw new Error(msg);
    }
  };

  const times = getRandDistArray(partCount, makeTime);
  for (let i = 0; i < times.length; i++) {
    const timeout = times[i];
    await sleep(timeout);
    await update();
    maybeThrow();
  }

  // periodically throw in an outlier
  if (Math.random() < 0.05) {
    await sleep(makeTime * Math.random());
  }

  if (progress < 100) {
    await job.updateProgress(100);
  }

  console.log(`${queue} #${orderNumber}: ${product} done.`);

  return {
    serialNumber: getRandomString(8),
    manufacturedOn: new Date(),
    inspectorId: rand(10, 400),
  };
};
