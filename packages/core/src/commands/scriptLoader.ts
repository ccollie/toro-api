import boom from '@hapi/boom';
import crypto from 'crypto';
import * as fs from 'fs';
import glob from 'glob';
import * as path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);

const GLOB_OPTS = { dot: true, silent: false, sync: true };
const RE_INCLUDE = /^[\-]{2,3}[ \t]*@include[ \t]+(["'])(.+?)\1[; \t\n]*$/m;
const RE_EMPTY_LINE = /^\s+$/gm;

export interface Command {
  name: string;
  sha: string;
  options: {
    numberOfKeys: number;
    lua: string;
  };
}

export interface FileInfo {
  path: string;
  content: string;
  match: string;
  includes: FileInfo[];
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
  if (name[0] == path.sep) name = name.substr(1);
  const textheader = '---[ START ' + name + ' ]---';
  const textfooter = '---[ END ' + name + ' ]---';
  return `${textheader}\n${content}\n${textfooter}`;
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

/**
 * Recursively collect all scripts included in a file
 * @param file  the parent file
 * @param cache a cache for file metadata to increase efficiency. Since a file can be included
 * multiple times, we make sure to load it only once.
 * @param stack internal stack to prevent circular references
 */
function collectFilesInternal(
  file: FileInfo,
  cache: Map<string, FileInfo>,
  stack: string[],
): FileInfo {
  if (stack.includes(file.path)) {
    throw boom.badRequest(`circular reference: "${file}"`, { stack });
  }
  stack.push(file.path);

  let res;

  let content = file.content;

  while ((res = RE_INCLUDE.exec(content)) !== null) {
    const [match, , reference] = res;

    const pattern = path.normalize(
      path.resolve(path.dirname(file.path), ensureExt(reference)),
    );
    const refPaths = glob.sync(pattern, GLOB_OPTS).map((x) => path.resolve(x));

    if (refPaths.length === 0) {
      const pos = findPos(file.content, match);
      throw boom.notFound(
        `not found: "${reference}", referenced in "${file.path}"`,
        { stack, file, ...pos },
      );
    }

    refPaths.forEach((path) => {
      const hasDependent = file.includes.find((x) => x.path === path);
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
        const buf = fs.readFileSync(path, { flag: 'r' });
        let childContent = buf.toString();
        childContent = childContent.replace(RE_EMPTY_LINE, '');
        // this represents a normalized version of the path to make replacement easy
        token = getReplacementToken(path);
        dependent = {
          path,
          content: childContent,
          match: token,
          includes: [],
        };
        cache.set(token, dependent);
      } else {
        token = dependent.match;
      }

      content = content.replace(match, token);

      file.includes.push(dependent);
      collectFilesInternal(dependent, cache, stack);
    });
  }

  file.content = content;
  cache.set(file.path, file);

  stack.pop();
  return file;
}

function collectFiles(file: FileInfo, cache: Map<string, FileInfo>) {
  return collectFilesInternal(file, cache, []);
}

/**
 * Construct the final version of a file by interpolating its includes in dependency order.
 * @param file the file whose content we want to construct
 * @param baseDir the base directory of the file. Used only to massage the filename for the banner
 * @param cache a cache to keep track of which includes have already been processed
 */
function mergeInternal(
  file: FileInfo,
  baseDir: string,
  cache?: Set<string>,
): string {
  cache = cache || new Set<string>();
  let content = file.content;
  file.includes.forEach((dependent) => {
    const emitted = cache.has(dependent.path);
    const fragment = mergeInternal(dependent, baseDir, cache);
    let replacement =
      emitted || !fragment ? '' : bannerize(dependent.path, baseDir, fragment);

    while (content.indexOf(dependent.match) >= 0) {
      content = content.replace(dependent.match, replacement);
      replacement = '';
    }
    cache.add(dependent.path);
  });

  return content;
}

function getFullDirname(filename: string): string {
  const parts = filename.split(path.sep);
  return parts.splice(0, parts.length - 1).join(path.sep);
}

export function processScript(
  filename: string,
  content: string,
  cache?: Map<string, FileInfo>,
): string {
  cache = cache ?? new Map<string, FileInfo>();
  const fileInfo: FileInfo = {
    path: filename,
    match: '',
    content,
    includes: [],
  };

  collectFiles(fileInfo, cache);
  const baseDir = getFullDirname(filename);
  return mergeInternal(fileInfo, baseDir);
}

export async function loadScript(
  filename: string,
  cache?: Map<string, FileInfo>,
): Promise<string> {
  const buf = await readFile(filename);
  const content = buf.toString();
  return processScript(filename, content, cache);
}

export async function loadCommand(
  filePath: string,
  cache?: Map<string, FileInfo>,
): Promise<Command> {
  const longName = path.basename(filePath, '.lua');
  const name = longName.split('-')[0];
  const numberOfKeys = parseInt(longName.split('-')[1]);

  const content = await loadScript(filePath, cache);
  const sha = calcSha1(content);

  return {
    name,
    sha,
    options: { numberOfKeys, lua: content },
  };
}
