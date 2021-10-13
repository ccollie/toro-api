import * as fs from 'fs';
import { resolve, join } from 'path';
import { schemaComposer } from 'graphql-compose';

const PATH = '../src/server/graphql/sdl';

const resolvedPath = resolve(__dirname, PATH);
if (!fs.existsSync(resolvedPath)) {
  fs.mkdirSync(resolvedPath, { recursive: true });
  console.log('Directory is created.');
}
const destFilename = join(resolvedPath, 'sdl.graphql');
const sdl = schemaComposer.toSDL();
(async () => {
  await fs.promises.writeFile(destFilename, sdl, {
    encoding: 'utf8',
    flag: 'w',
  });
  console.log('sdl written to "' + destFilename + '"');
})();
