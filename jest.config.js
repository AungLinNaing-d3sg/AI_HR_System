// @ts-check
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Path to the Next.js app, used to load next.config.js and .env files.
  dir: './',
});

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    // The real `server-only` package throws unconditionally on import,
    // which is only safe in the Next.js build pipeline (it aliases the
    // module differently per bundle target). Under Jest there is no such
    // aliasing, so we substitute a no-op to allow server-only modules
    // (lib/utils/jwt.ts, lib/utils/authCookies.ts) to be unit tested.
    '^server-only$': '<rootDir>/src/__mocks__/server-only.ts',
  },
  collectCoverageFrom: [
    'src/lib/**/*.{ts,tsx}',
    'src/hooks/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    'src/lib/': {
      lines: 70,
      branches: 70,
    },
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
};

module.exports = createJestConfig(config);
