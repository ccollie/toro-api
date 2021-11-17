import path from 'path';
import { RedisClient } from 'bullmq';
import { loadCommand as _loadCommand, loadScript, Command } from '../../src/commands';
const SCRIPT_PATH = path.normalize(path.join(__dirname, '../../src/commands'));
const INCLUDE_PATH = path.join(SCRIPT_PATH, 'includes');

import { compileExpression } from '../../src/lib/expr-utils';

export { compileExpression, Command };

function ensureExt(filename: string, ext = 'lua'): string {
    const foundExt = path.extname(filename);
    if (foundExt && foundExt !== '.') return filename;
    if (ext && ext[0] !== '.') ext = `.${ext}`;
    return `${filename}${ext}`;
}

function getFullPath(dir: string, fileName: string): string {
    return path.normalize(path.resolve(dir, ensureExt(fileName)));
}

async function loadCommand(client: RedisClient, fullPath: string): Promise<RedisClient> {
    const command = await _loadCommand(fullPath);
    client.defineCommand(command.name, command.options);
    return client;
}

export async function loadIncludeScript(name: string): Promise<string> {
    const fullPath = getFullPath(INCLUDE_PATH, name);
    return loadScript(fullPath);
}
