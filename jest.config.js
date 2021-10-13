const { pathsToModuleNameMapper } = require('ts-jest/utils');
const { readJSONSync } = require('fs-extra');

module.exports = {
  roots: ['<rootDir>/__tests__'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testMatch: [
    '**/__tests__/**/*.js?(x)',
    '**/?(*.)+(spec|test).js?(x)',
    '**/__tests__/?(*.)+(spec|test).ts?(x)',
    '**/__tests__/**/*.ts?(x)',
    '**/?(*.)+(spec|test).ts?(x)',
  ],
  modulePathIgnorePatterns: ['/dist/'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  coveragePathIgnorePatterns: ['node_modules'],
  moduleFileExtensions: ['ts', 'mts', 'tsx', 'js', 'cjs', 'jsx'],
  moduleNameMapper: pathsToModuleNameMapper(
    readJSONSync('./tsconfig.json').compilerOptions.paths,
    { prefix },
  ),
  testEnvironment: 'node',
  setupFiles: ['jest-date-mock'],
  preset: 'ts-jest',
  globals: {
    'ts-jest': {
      diagnostics: false, // https://huafu.github.io/ts-jest/user/config/diagnostics
    },
  },
};
