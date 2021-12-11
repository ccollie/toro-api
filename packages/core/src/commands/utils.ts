import { RedisClient, scriptLoader } from 'bullmq';

export async function ensureScriptsLoaded(
  client: RedisClient,
): Promise<RedisClient> {
  await scriptLoader.load(client, __dirname);
  return client;
}

const RE_ERROR = /user_script\:([0-9]+)\:\s*(.*)/m;

export function parseScriptError(
  err: string,
): { line: number; message: string } | undefined {
  const res = RE_ERROR.exec(err);
  if (res) {
    const [, l, t] = res;
    return {
      line: parseInt(l),
      message: t,
    };
  }
  return undefined;
}
