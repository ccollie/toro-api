// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getConfig } = require('alpen-testing/jestConfig');

module.exports = getConfig({
  testMatch: [
    '**/__tests__/*.spec.ts'
  ],
  transformIgnorePatterns: [
    '/node_modules/(?!tslib/)',
  ],
});
