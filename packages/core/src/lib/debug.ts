import debug from 'debug';
const prefix = 'alpen:';

export function createDebug(namespace: string): any {
  return debug(`${prefix}${namespace}`);
}
