import { RedisClient } from 'bullmq';
import { Command, loadScripts as loadDir } from './scriptLoader';

let scripts: Command[];

const initClients = new WeakSet();

export async function loadScripts(client: RedisClient): Promise<RedisClient> {
  // make sure we only do this once per client
  if (!initClients.has(client)) {
    initClients.add(client);
    scripts = scripts || (await loadDir());
    scripts.forEach((command) => {
      // Only define the command if not already defined
      if (!(client as any)[command.name]) {
        client.defineCommand(command.name, command.options);
      }
    });
  }
  return client;
}

export function parseScriptError(err: string): string {
  const errorRegex = /@user_script\:[0-9]+\:\s+user_script\:[0-9]+\:\s*(.*)/g;
  const matches = err.match(errorRegex);
  // TODO
  return err;
}
