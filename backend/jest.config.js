module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/ai-tests/**/*.test.js'],
  setupFilesAfterEnv: ['./test-setup.js'],
  coveragePathIgnorePatterns: ['/node_modules/', '/migrations/', '/utils/'],
  verbose: true,
  moduleNameMapper: {
    '^\\@tables/(.*)$': '<rootDir>/tables/$1',
    '^\\@utils/(.*)$': '<rootDir>/utils/$1',
    '^\\@routes/(.*)$': '<rootDir>/routes/$1',
    '^\\@middleware/(.*)$': '<rootDir>/middleware/$1',
    '^\\@config$': '<rootDir>/config.js',
    '^\\@db_connection$': '<rootDir>/db_connection.js',
    '^\\@secrets$': '<rootDir>/secrets.js',
    '^\\@lib/(.*)$': '<rootDir>/lib/$1'
},
}
