import * as fs from 'fs';
import { resolve } from 'path';
import { getSDL } from '@alpen/api';

const destFilename = resolve(__dirname, '..', 'schema.graphql');
const sdl = getSDL();
(async () => {
  await fs.promises.writeFile(destFilename, sdl, {
    encoding: 'utf8',
    flag: 'w',
  });
  console.log('sdl written to "' + destFilename + '"');
})();
