// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../../package.json');
const { name, version, author, homepage } = pkg;

export interface PackageInfo {
  name: string;
  version: string;
  author: string;
  homepage: string;
}

export const packageInfo: PackageInfo = {
  name,
  version,
  author,
  homepage,
};
