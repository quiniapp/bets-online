module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/api/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: '<rootDir>/api/tsconfig.json',
      diagnostics: false
    }]
  },
  moduleNameMapper: {
    '^helper$': '<rootDir>/helper/dist/index.js'
  },
  testPathIgnorePatterns: ['/node_modules/'],
  testTimeout: 30000,
  setupFiles: ['<rootDir>/api/tests/setup.ts'],
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
