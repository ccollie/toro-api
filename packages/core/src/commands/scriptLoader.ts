import boom from '@hapi/boom';
import { RedisClient } from 'bullmq';
import crypto from 'crypto';
import glob from 'glob';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);

const GLOB_OPTS = { dot: true, silent: false, sync: true };
const RE_INCLUDE = /^[-]{2,3}[ \t]*@include[ \t]+(["'])(.+?)\1[; \t\n]*$/m;
const RE_EMPTY_LINE = /^\s+$/gm;

export interface Command {
  name: string;
  options: {
    numberOfKeys: number;
    lua: string;
  };
}

/**
 * Script metadata
 */
export interface ScriptInfo {
  /**
   * The path to the script. For includes, this is the normalized path,
   * whereas it may not be normalized for the top-level parent
   */
  path: string;
  /**
   * The raw script content
   */
  content: string;
  /**
   * A hash of the normalized path for easy replacement in the parent
   */
  token: string;
  /**
   * Metadata on the scripts that this script includes
   */
  includes: ScriptInfo[];
}

function calcSha1(data: string): string {
  return crypto.createHash('sha1').update(data).digest('hex');
}

function getReplacementToken(normalizedPath: string): string {
  return `--- @${calcSha1(normalizedPath)}`;
}

function bannerize(fileName: string, baseDir: string, content: string): string {
  if (!content) return '';
  let name = fileName.substr(baseDir.length);
  if (name[0] == path.sep) {
    name = name.substr(1);
  }
  const header = '---[ START ' + name + ' ]---';
  const footer = '---[ END ' + name + ' ]---';
  return `${header}\n${content}\n${footer}`;
}

function findPos(content: string, match: string) {
  const pos = content.indexOf(match);
  const arr = content.slice(0, pos).split('\n');
  return {
    line: arr.length,
    column: arr[arr.length - 1].length + match.indexOf('@include') + 1,
  };
}

function ensureExt(filename: string, ext = 'lua'): string {
  const foundExt = path.extname(filename);
  if (foundExt && foundExt !== '.') return filename;
  if (ext && ext[0] !== '.') ext = `.${ext}`;
  return `${filename}${ext}`;
}

function splitFilename(filePath: string): { name: string; numberOfKeys: number } {
  const longName = path.basename(filePath, '.lua');
  const name = longName.split('-')[0];
  const numberOfKeys = parseInt(longName.split('-')[1]);
  return { name, numberOfKeys }
}

/**
 * Recursively collect all scripts included in a file
 * @param file  the parent file
 * @param cache a cache for file metadata to increase efficiency. Since a file can be included
 * multiple times, we make sure to load it only once.
 * @param stack internal stack to prevent circular references
 */
async function collectFilesInternal(
  file: ScriptInfo,
  cache: Map<string, ScriptInfo>,
  stack: string[],
): Promise<void> {
  if (stack.includes(file.path)) {
    throw boom.badRequest(`circular reference: "${file.path}"`, { stack });
  }
  stack.push(file.path);

  let res;

  let content = file.content;

  while ((res = RE_INCLUDE.exec(content)) !== null) {
    const [match, , reference] = res;

    const pattern = path.normalize(
      path.resolve(path.dirname(file.path), ensureExt(reference)),
    );

    const refPaths = glob.sync(pattern, GLOB_OPTS).map((x: string) => path.resolve(x));

    if (refPaths.length === 0) {
      const pos = findPos(file.content, match);
      throw boom.notFound(
        `not found: "${reference}", referenced in "${file.path}"`,
        { stack, file, ...pos },
      );
    }

    for (let i = 0; i < refPaths.length; i++) {
      const path: string = refPaths[i];
      const hasDependent = file.includes.find((x: ScriptInfo) => x.path === path);
      if (hasDependent) {
        const pos = findPos(file.content, match);
        throw boom.badRequest(
          `file "${path}" already @included in "${reference}"`,
          { stack, file, ...pos },
        );
      }
      let dependent = cache.get(path);
      let token: string;

      if (!dependent) {
        const buf = await readFile(path, { flag: 'r' });
        let childContent = buf.toString();
        childContent = childContent.replace(RE_EMPTY_LINE, '');
        // this represents a normalized version of the path to make replacement easy
        token = getReplacementToken(path);
        dependent = {
          path,
          content: childContent,
          token,
          includes: [],
        };
        cache.set(token, dependent);
      } else {
        token = dependent.token;
      }

      content = content.replace(match, token);

      file.includes.push(dependent);
      await collectFilesInternal(dependent, cache, stack);
    }
  }

  file.content = content;
  cache.set(file.path, file);

  stack.pop();
}

async function collectFiles(file: ScriptInfo, cache: Map<string, ScriptInfo>) {
  return collectFilesInternal(file, cache, []);
}

/**
 * Construct the final version of a file by interpolating its includes in dependency order.
 * @param file - the file whose content we want to construct
 * @param baseDir - the base directory of the file. Used only to massage the filename for the banner
 * @param cache - a cache to keep track of which includes have already been processed
 */
function mergeInternal(
  file: ScriptInfo,
  baseDir: string,
  cache?: Set<string>,
): string {
  cache = cache || new Set<string>();
  let content = file.content;
  file.includes.forEach((dependent) => {
    const emitted = cache.has(dependent.path);
    const fragment = mergeInternal(dependent, baseDir, cache);
    const replacement =
      emitted || !fragment ? '' : bannerize(dependent.path, baseDir, fragment);

    if (!replacement) {
      content = content.replaceAll(dependent.token, '');
    } else {
      // replace the first instance with the dependency
      content = content.replace(dependent.token, replacement);
      // remove the rest
      content = content.replaceAll(dependent.token, '');
    }

    cache.add(dependent.path);
  });

  return content;
}

function getFullDirname(filename: string): string {
  const parts = filename.split(path.sep);
  return parts.splice(0, parts.length - 1).join(path.sep);
}

export async function processScript(
  filename: string,
  content: string,
  cache?: Map<string, ScriptInfo>,
): Promise<string> {
  cache = cache ?? new Map<string, ScriptInfo>();
  const fileInfo: ScriptInfo = {
    path: filename,
    token: '',
    content,
    includes: [],
  };

  await collectFiles(fileInfo, cache);
  const baseDir = getFullDirname(filename);
  return mergeInternal(fileInfo, baseDir);
}

export async function loadScript(
  filename: string,
  cache?: Map<string, ScriptInfo>,
): Promise<string> {
  const buf = await readFile(filename);
  const content = buf.toString();
  return processScript(filename, content, cache);
}

async function _loadCommand(
  filePath: string,
  cache?: Map<string, ScriptInfo>,
): Promise<Command> {
  const { name, numberOfKeys } = splitFilename(filePath);
  const content = await loadScript(filePath, cache);

  return {
    name,
    options: { numberOfKeys, lua: content },
  };
}

export async function loadCommand(filePath: string): Promise<Command> {
  const cache = new Map<string, ScriptInfo>();
  return _loadCommand(filePath, cache);
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
export async function loadScripts(dir?: string): Promise<Command[]> {
  const files = await readdir(dir);

  const luaFiles = files.filter(
    (file: string) => path.extname(file) === '.lua',
  );

  if (luaFiles.length === 0) {
    /**
     * To prevent unclarified runtime error "updateDelayset is not a function
     * @see https://github.com/OptimalBits/bull/issues/920
     */
    throw new Error('No .lua files found!');
  }

  const commands: Command[] = [];
  const cache = new Map<string, ScriptInfo>();

  for (let i = 0; i < luaFiles.length; i++) {
    const file = luaFiles[i];
    const command = await _loadCommand(file, cache);
    commands.push(command);
  }

  return commands;
}

const clientPaths = new WeakMap<RedisClient, Set<string>>();

export const load = async function(client: RedisClient, pathname?: string) {
  pathname = pathname ?? __dirname;

  let paths: Set<string> = clientPaths.get(client);
  if (!paths) {
    paths = new Set<string>();
    clientPaths.set(client, paths);
  }
  if (!paths.has(pathname)) {
    paths.add(pathname);

    const scripts = await loadScripts(pathname);
    scripts.forEach((command: Command) => {
      // Only define the command if not already defined
      if (!(client as any)[command.name]) {
        client.defineCommand(command.name, command.options);
      }
    });
  }
};
