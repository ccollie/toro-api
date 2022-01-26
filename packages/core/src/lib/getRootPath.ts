import { accessSync, constants } from 'fs';
import { dirname } from 'path';

// Determine the project root
// https://stackoverflow.com/a/18721515
export function getRootPath(): string {
  for (const modPath of (module.paths || [])) {
    try {
      const prospectivePkgJsonDir = dirname(modPath);
      accessSync(modPath, constants.F_OK);
      return prospectivePkgJsonDir;
      // eslint-disable-next-line no-empty
    } catch (e) {}
  }
}
