/** @type {import('jest').Config} */
module.exports = {
  displayName: 'unit',
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/unit/**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
};
