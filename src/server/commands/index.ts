'use strict';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { promisify } from 'util';
import pMap from 'p-map';
import IORedis from 'ioredis';

// TODO node >= 10 could be used require('fs').promises()
const readFileAsync = promisify(fs.readFile);

const FILES = [
  { path: './getJobState-6.lua', numberOfKeys: 6, name: 'getJobState' },
  { path: './getJobNames-8.lua', numberOfKeys: 8, name: 'getJobNames' },
  { path: './getJobsByFilter-1.lua', numberOfKeys: 1, name: 'getJobsByFilter' },
  { path: './timeseries-lex.lua', numberOfKeys: 1, name: 'timeseries' },
  {
    path: './getAvgJobMemoryUsage-1.lua',
    numberOfKeys: 1,
    name: 'getAvgJobMemoryUsage',
  },
  {
    path: './getDurationAverage-1.lua',
    numberOfKeys: 1,
    name: 'getDurationAverage',
  },
  {
    path: './getWaitTimeAverage-1.lua',
    numberOfKeys: 1,
    name: 'getWaitTimeAverage',
  },
];

let scripts;

const initClients = new WeakSet();

function calcSha1(str: string): string {
  return createHash('sha1').update(str, 'utf8').digest('hex');
}

async function loadFile(file: string): Promise<string> {
  const fullPath = path.resolve(__dirname, file);
  const lua = await readFileAsync(fullPath);
  return lua.toString();
}

async function loadFiles() {
  return pMap(FILES, async (file) => {
    const { name, numberOfKeys, path } = file;

    const content = await loadFile(path);
    const sha = calcSha1(content);

    return {
      name,
      sha,
      options: { numberOfKeys, lua: content },
    };
  });
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
