import crypto from 'crypto';
import nanoid from 'nanoid';
export * from '../../../factories';


export function randomString(length = 10): string {
  return crypto.randomBytes(10).toString('hex');
}

export function randomId(len = 8): string {
  return nanoid(8);
}
