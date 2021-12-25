process.env.NODE_ENV = 'example';
import { QueueScheduler, Worker } from 'bullmq';
import { backup, tacos, widgets } from './processors';

const tacoWorker = new Worker('tacos', tacos.process, { concurrency: 10 });
const widgetWorker = new Worker('widgets', widgets.process, { concurrency: 10,});
const backupWorker = new Worker('backup', backup.process, { concurrency: 2,});
const backupScheduler = new QueueScheduler('backup');


async function exit() {
  await Promise.all([
    this.tacoWorker.close(),
    this.widgetWorker.close(),
    this.backupWorker.close(),
    this.backupScheduler.close(),
  ]);
}

process.once('exit', exit);
process.once('SIGINT', exit);
process.once('SIGTERM', exit);
