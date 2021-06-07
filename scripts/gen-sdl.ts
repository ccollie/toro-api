const PATH = '../src/server/graphql/sdl';

import { toSDL } from '../src/server/graphql/schema';
import fs from 'fs';
import path from 'path';

const sdl = toSDL();
if (!fs.existsSync(PATH)) {
  fs.mkdirSync(PATH);
  console.log('Directory is created.');
}
const destFilename = path.join(PATH, 'sdl');
fs.writeFileSync(destFilename, sdl);
console.log('sdl written to "' + destFilename + '"');
