import { Worker, QueueScheduler } from 'bullmq';
import { tacos, widgets, encoding, backup } from './processors';

const tacoWorker = new Worker('tacos', tacos.process, { concurrency: 10 });
const widgetWorker = new Worker('widgets', widgets.process, {
  concurrency: 10,
});
const backupWorker = new Worker('backup', backup.process, { concurrency: 2 });
const widgetScheduler = new QueueScheduler('widgets');
const backupScheduler = new QueueScheduler('backup');
