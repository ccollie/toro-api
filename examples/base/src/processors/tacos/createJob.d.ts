import { Job, Queue } from 'bullmq';
export declare function createJob(queue: Queue, orderNumber: string): Promise<Job>;
