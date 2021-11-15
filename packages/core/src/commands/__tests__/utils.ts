import * as path from 'path';
import { Command, RedisClient, scriptLoader} from 'bullmq';
import { compileExpression } from '../../lib/expr-utils';
import { clearDb, createClient, createQueue } from '../../__tests__/factories';

const SCRIPT_PATH = path.normalize(path.join(__dirname, '../'));
const INCLUDE_PATH = path.join(SCRIPT_PATH,  'includes');

export { compileExpression, Command, clearDb, createClient, createQueue };

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
    const command = await scriptLoader.loadCommand(fullPath);
    client.defineCommand(command.name, command.options);
    return client;
}

export async function loadIncludeScript(name: string): Promise<string> {
    const fullPath = getFullPath(INCLUDE_PATH, name);
    const cmd = await scriptLoader.loadCommand(fullPath);
    return cmd.options.lua;
}
