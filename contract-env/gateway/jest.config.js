module.exports = {
  clearMocks: true,

  moduleFileExtensions: ['ts', 'js'],

  testEnvironment: 'node',

  transformIgnorePatterns: ['<rootDir>/node_modules/(?!@assemblyscript/.*)'],

  transform: {
    '^.+\\.(ts|js)$': 'ts-jest',
  },
};
