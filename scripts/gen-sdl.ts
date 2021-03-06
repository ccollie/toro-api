const PATH = '../src/server/graphql/sdl';

import { toSDL } from '../src/server/graphql/schema';
import fs from 'fs';
import path from 'path';

const resolvedPath = path.resolve(__dirname, PATH);
if (!fs.existsSync(resolvedPath)) {
  fs.mkdirSync(resolvedPath, { recursive: true });
  console.log('Directory is created.');
}
const destFilename = path.join(resolvedPath, 'sdl.graphql');
const sdl = toSDL();
(async () => {
  await fs.promises.writeFile(destFilename, sdl, {
    encoding: 'utf8',
    flag: 'w',
  });
  console.log('sdl written to "' + destFilename + '"');
})();
