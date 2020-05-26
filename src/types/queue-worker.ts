export interface QueueWorker {
  id: string;
  addr: string;
  port: number;
  name: string;
  age: number;
  idle: number;
  flags: string;
  db: number;
  sub: number;
  psub: number;
  multi: number;
  qbuf: number;
  qbufFree: number;
  obl: number;
  oll: number;
  omem: number;
  events: string;
  cmd: string;
  started: number;
}
