import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { RedisClient } from 'bullmq';
import { Command, FileInfo, loadCommand } from './scriptLoader';

const readdir = promisify(fs.readdir);

let scripts: Command[];

const initClients = new WeakSet();


export async function loadScripts(client: RedisClient): Promise<RedisClient> {
  // make sure we only do this once per client
  if (!initClients.has(client)) {
    initClients.add(client);
    scripts = scripts || (await loadFiles());
    scripts.forEach((command) => {
      client.defineCommand(command.name, command.options);
    });
  }
  return client;
}

/**
 * Load redis lua scripts.
 * The name of the script must have the following format:
 *
 * cmdName-numKeys.lua
 *
 * cmdName must be in camel case format.
 *
 * For example:
 * moveToFinish-3.lua
 *
 */
async function loadFiles(dir?: string): Promise<Command[]> {
  dir = dir || __dirname;
  const files = await readdir(dir);
  const cache = new Map<string, FileInfo>();

  async function loadFile(file: string): Promise<Command> {
    const fullPath = path.join(dir, file);
    return loadCommand(fullPath, cache);
  }

  return Promise.all<Command>(
    files.filter((file: string) => path.extname(file) === '.lua').map(loadFile),
  );
}

export function parseScriptError(err: string): string {
  const errorRegex = /@user_script\:[0-9]+\:\s+user_script\:[0-9]+\:\s*(.*)/g;
  const matches = err.match(errorRegex);
  // TODO
  return err;
}
