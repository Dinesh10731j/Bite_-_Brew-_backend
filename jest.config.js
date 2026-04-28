/** @type {import('jest').Config} */
module.exports = {
  projects: ['<rootDir>/jest.unit.config.js', '<rootDir>/jest.integration.config.js'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 5,
      functions: 15,
      lines: 30,
      statements: 30,
    },
  },
};
