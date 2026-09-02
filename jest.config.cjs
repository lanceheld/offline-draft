module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/src/**/tests/**/*.test.[jt]s?(x)'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
  transform: {
    '^.+\\.[tj]sx?$': 'babel-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!(uuid)/)'],
  coverageProvider: 'babel',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/tests/**',
    '!src/main.tsx',
  ],
};
