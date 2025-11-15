module.exports = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',
  
  // Test environment (Node.js for your migration tool)
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|specs|test).ts'
  ],
  
  // TypeScript files to include
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Transform TypeScript files
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.specs.ts',
    '!src/**/*.test.ts'
  ],
  
  // Coverage output directory
  coverageDirectory: 'coverage',
  
  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Setup files (if needed)
  // setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  
  // Module paths (align with your tsconfig.json if using path mapping)
  roots: ['<rootDir>/src', '<rootDir>/scripts'],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Verbose output for test results
  verbose: true
};