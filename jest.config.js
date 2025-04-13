/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    // Handle CSS imports (with CSS modules)
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
    // Handle CSS imports (without CSS modules)
    '^.+\\.(css|sass|scss)$': '<rootDir>/__mocks__/styleMock.js',
    // Handle static assets
    '^.+\\.(jpg|jpeg|png|gif|webp|svg|ico)$': '<rootDir>/__mocks__/fileMock.js',
    // Mock problematic ES modules
    '^graphql-request$': '<rootDir>/src/__mocks__/graphql-request.ts',
    '^@neo4j-ndl/react$': '<rootDir>/src/__mocks__/@neo4j-ndl/react.ts',
    '^antlr4$': '<rootDir>/src/__mocks__/antlr4.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/cypress/'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!graphql-request|@neo4j-ndl|antlr4|@neo4j-cypher).+\\.js$'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__mocks__/',
    '/cypress/',
  ],
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
};
