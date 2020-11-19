module.exports = {
  roots: [
    "<rootDir>/__tests__"
  ],
  transform: {
    "^.+\\.tsx?$": "ts-jest"
  },
  testMatch: [
    "**/__tests__/**/*.js?(x)",
    "**/?(*.)+(spec|test).js?(x)",
    "**/__tests__/?(*.)+(spec|test).ts?(x)",
    "**/__tests__/**/*.ts?(x)",
    "**/?(*.)+(spec|test).ts?(x)"
  ],
  moduleFileExtensions: [
    "ts",
    "tsx",
    "js",
    "jsx",
    "json",
    "node"
  ],
  testEnvironment: "node",
  setupFiles: ["jest-date-mock"],
  preset: 'ts-jest',
  moduleNameMapper: {
    "^@src/(.*)$": "<rootDir>/src/$1",
    "tests/(.*)": "<rootDir>/__tests__/$1",
  }
};
