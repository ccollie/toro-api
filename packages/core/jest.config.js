const { getConfig } = require('alpen-testing/jestConfig');

module.exports = getConfig({
  transformIgnorePatterns: [
    '/node_modules/(?!tslib/)',
  ],
});
