import { systemClock } from '../lib';

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
  role: string;
  obl: number;
  oll: number;
  omem: number;
  events: string;
  cmd: string;
  started: number;
}

export function convertWorker(worker: Record<string, string>): QueueWorker {
  const now = systemClock.getTime();
  const {
    age,
    id,
    cmd,
    db,
    events,
    flags,
    idle,
    multi,
    name,
    obl,
    oll,
    omem,
    psub,
    qbuf,
    role,
    sub,
    addr: address,
  } = worker;
  const [addr, port] = address.split(':');
  const qbufFree = worker['qbuf-free'];

  function toInt(val: string | undefined, defaultVal = 0): number {
    if (val === undefined) return defaultVal;
    const res = parseInt(val ?? '0', 10);
    return isNaN(res) ? defaultVal : res;
  }

  const _age = toInt(age) * 1000;
  return {
    id,
    addr,
    age: _age,
    cmd,
    db: toInt(db),
    events,
    flags,
    idle: toInt(idle) * 1000,
    multi: toInt(multi),
    name,
    obl: toInt(obl),
    oll: toInt(oll),
    omem: toInt(omem),
    psub: toInt(psub),
    qbuf: toInt(qbuf),
    qbufFree: toInt(qbufFree),
    port: toInt(port, 6379),
    role,
    started: now - _age,
    sub: toInt(sub),
  };
}
