const { getConfig } = require('alpen-testing/jestConfig');

module.exports = getConfig({
  testMatch: [
    '**/?(*.)+(spec|test).js?(x)',
    '**/__tests__/?(*.)+(spec|test).ts?(x)',
    '**/?(*.)+(spec|test).ts?(x)',
  ]
});
