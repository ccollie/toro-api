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
  testPathIgnorePatterns: ['/dist/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'mjs', 'node'],
  testEnvironment: 'node',
  setupFiles: ['jest-date-mock'],
  preset: 'ts-jest',
  globals: {
    'ts-jest': {
      diagnostics: false, // https://huafu.github.io/ts-jest/user/config/diagnostics
    },
  },
};
