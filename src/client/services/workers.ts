import Request from './request';

export interface WorkerData {
  id: number;
  age: number;
  idle: number;
  db: number;
  qbuf: number;
  'qbuf-free': number;
  sub: number;
  obl: number;
  omem: number;
  isClosing: boolean;
  isBlocking: boolean;
  isMaster: boolean;
  inMonitorMode: boolean;
  isReplica: boolean;
}

export class WorkerService {
  constructor(private http: Request) {}

  /**
   * Gets the list of workers for the given queue
   * @param {string} host host name
   * @param {string} queue queue name
   * @returns {Promise<WorkerData>}
   */
  async getWorkers(host: string, queue: string): Promise<WorkerData[]> {
    const workers = await this.http.get(
      `queues/${encodeURIComponent(host)}/${encodeURIComponent(queue)}/workers`,
    );
    workers.forEach((worker) => {
      worker.id = parseInt(worker.id, 10);
      worker.host = host;
      worker.queue = worker.name;
    });
    return workers.sort((a, b) => a.idle - b.idle);
  }
}
