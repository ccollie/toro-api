import debug from 'debug';
const prefix = 'toro:';

export function createDebug(namespace: string): any {
  return debug(`${prefix}${namespace}`);
}
