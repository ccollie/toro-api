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
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import IORedis from 'ioredis';
import * as util from 'util';

const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);

interface Command {
  name: string;
  sha: string;
  options: {
    numberOfKeys: number;
    lua: string;
  };
}

let scripts: Command[];

const initClients = new WeakSet();

function calcSha1(str: string): string {
  return createHash('sha1').update(str, 'utf8').digest('hex');
}

export async function loadScripts(
  client: IORedis.Redis,
): Promise<IORedis.Redis> {
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

async function loadFiles(dir?: string): Promise<Command[]> {
  dir = dir || __dirname;
  const files = await readdir(dir);

  async function loadFile(file: string): Promise<Command> {
    const longName = path.basename(file, '.lua');
    const name = longName.split('-')[0];
    const numberOfKeys = parseInt(longName.split('-')[1]);

    const lua = await readFile(path.join(dir, file));
    const content = lua.toString();
    const sha = calcSha1(content);

    return {
      name,
      sha,
      options: { numberOfKeys, lua: content },
    };
  }

  return Promise.all<Command>(
    files.filter((file: string) => path.extname(file) === '.lua').map(loadFile),
  );
}

export * from './rule-scripts';
export * from './timeseries';
