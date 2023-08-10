const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig');

module.exports = {
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  testTimeout: 30000,
  moduleFileExtensions: ['ts', 'js'],

  testPathIgnorePatterns: ['/.yalc/', '/data/', '/_helpers'],

  testEnvironment: 'node',

  roots: ['<rootDir>'],
  modulePaths: [compilerOptions.baseUrl], // <-- This will be set to 'baseUrl' value
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths),

  transform: {
    '^.+\\.(ts|js)$': 'ts-jest',
  },

  silent: false,
};
