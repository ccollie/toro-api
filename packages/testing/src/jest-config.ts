import type {Config} from '@jest/types';
import {readJSONSync} from 'fs-extra';
import {relative, resolve} from 'path';
import {pathsToModuleNameMapper} from 'ts-jest/utils';

const rootPath = resolve(__dirname, '../../../');

process.env.TS_JEST_HOOKS = resolve(__dirname, 'tsJestHooks.js');

export function getConfig({ ...rest }: Config.InitialOptions = {}): Record<
  string,
  unknown
> {
  const prefix = `<rootDir>/${relative(process.cwd(), rootPath)}`;

  return {
    testMatch: [process.cwd().replace(/\\/g, '/') + '/__tests__/**/*.spec.ts'],
    testEnvironment: 'node',
    transform: {'\\.[jt]sx?$': 'ts-jest'},
    globals: {
      'ts-jest': {
        isolatedModules: true,
      },
    },
    modulePathIgnorePatterns: ['/dist/'],
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
    coveragePathIgnorePatterns: ['node_modules'],
    moduleNameMapper: pathsToModuleNameMapper(
        readJSONSync(resolve(rootPath, 'tsconfig.json')).compilerOptions.paths,
        {prefix},
    ),
    collectCoverage: true,
    watchman: false,
    testTimeout: 10000,
    ...rest,
  };
}
