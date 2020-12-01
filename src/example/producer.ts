process.env.NODE_ENV = 'example';
import { Queue } from 'bullmq';

import prexit from 'prexit';
import { tacos, widgets, backup } from './processors';

let isStopped = false;

async function keepProducingJobs(queue, createJob, num = 1, count = 10) {
  const stop = num + count;
  for (let i = num; i <= stop; i++) {
    await createJob(queue, i);
  }
  if (!isStopped) {
    setTimeout(() => keepProducingJobs(queue, createJob, ++num), 15 * 1000);
  }
}

async function run() {
  const tacoQueue = new Queue('tacos');
  const widgetQueue = new Queue('widgets');
  const backupQueue = new Queue('backup');

  await backup.createScheduledJobs(backupQueue);

  await keepProducingJobs(tacoQueue, tacos.createJob, 1, 10);
  await keepProducingJobs(widgetQueue, widgets.createJob, 1, 5);
}

prexit(() => {
  isStopped = true;
});

(async () => {
  await run();
})();
