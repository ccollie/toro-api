import { readFileSync } from 'fs';
import { resolve, sep } from 'path';

export const config: import('bob-esbuild').BobConfig = {
    tsc: {
        dirs: ['packages/*/*', 'internal/*', 'examples/*'],
    },
    verbose: false,
};
