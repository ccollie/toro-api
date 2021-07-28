import { sleep, rand } from '../utils';
import { Job } from 'bullmq';

const ONE_MILLION = 1000000;

function sizeToMs(size: number, mult: number): number {
  let temp = Math.floor(size / ONE_MILLION);
  if (temp < 1000) {
    temp = temp * 5;
  }
  return temp * rand(1, mult);
}

function calcTimeout(job: Job, file, stage: string): number {
  const { size } = file;
  switch (stage) {
    case 'download':
      return sizeToMs(size, 4);
    case 'upload':
      return sizeToMs(size, 4);
    case 'transcode':
      return sizeToMs(size, 15);
    case 'metadata':
      return sizeToMs(size, 4);
  }
  return rand(100, 5000);
}

async function process(job: Job): Promise<any> {
  const { data } = job;
  const { orderNumber, filename, queue, stage } = data;

  const progress = 0;
  console.log(`Beginning ${stage} (${filename})...`);

  const timeout = calcTimeout(job, data, stage);

  const update = () => job.updateProgress(progress);

  for (let i = 0; i < timeout; i++) {
    await sleep(500);
    if (Math.random() < 0.2) {
      throw new Error(`Error processing file ${filename} ...`);
    }
    await update();
  }

  console.log(`${queue} #${orderNumber}: ${stage} ${filename} done.`);
}
