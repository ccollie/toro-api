import ms from 'ms';
import { gaussianBM } from '../latencies';
import { Job } from 'bullmq';

const options = {
  min: ms('10 secs'),
  max: ms('1.25 mins'),
  mean: ms('25 secs'),
};

function getLatency(): number {
  return gaussianBM(options.min, options.max);
}

export const process = async (job: Job): Promise<any> => {
  const { data } = job;
  const { queue } = data;
  const { protein, salsa, orderNumber } = data;
  const cookTime = getLatency();

  const logMsg = `queue: ${queue} #${orderNumber}: ${protein}, ${salsa} cooking for ${(
    cookTime / 1000
  ).toFixed(2)}s`;
  console.log(logMsg);

  let progress = 10;

  return new Promise<void>((resolve, reject) => {
    const update = (): number => {
      job.updateProgress(progress);
      return (progress += 25);
    };

    const maybeThrow = (): void => {
      const dice = Math.random();
      if (dice < 0.0725) {
        return reject(new Error(`taco #${job.id} burned`));
      }
    };

    const wake = (): void => {
      console.log(`${queue} #${orderNumber}: ${protein}, ${salsa} served`);
      resolve();
    };

    setTimeout(update, cookTime / 5);
    setTimeout(update, (cookTime / 5) * 2);
    setTimeout(update, (cookTime / 5) * 3);
    setTimeout(update, (cookTime / 5) * 4);
    setTimeout(maybeThrow, cookTime * Math.random());
    return setTimeout(wake, cookTime);
  });
};
