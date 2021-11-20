import { RedisClient } from 'bullmq';
import { load } from './scriptLoader';

export async function loadScripts(client: RedisClient): Promise<RedisClient> {
  return load(client);
}

const RE_ERROR = /user_script\:([0-9]+)\:\s*(.*)/m;

export function parseScriptError(err: string): { line: number, message: string } | undefined {
  const res = RE_ERROR.exec(err);
  if (res) {
    const [, l, t] = res;
    return {
      line: parseInt(l),
      message: t
    }
  }
  return undefined;
}
