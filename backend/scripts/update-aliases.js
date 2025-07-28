#!/usr/bin/env node

/**
 * Script to update module aliases across all configuration files
 * Run with: node scripts/update-aliases.js
 */

const fs = require('fs')
const path = require('path')
const { getPackageAliases, getJestAliases, getJsConfigAliases } = require('../config/aliases')

const rootDir = path.resolve(__dirname, '..')

/**
 * Update package.json _moduleAliases
 */
function updatePackageJson() {
  const packagePath = path.join(rootDir, 'package.json')
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))

  packageJson._moduleAliases = getPackageAliases()

  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n')
  console.log('✅ Updated package.json _moduleAliases')
}

/**
 * Update jest.config.js moduleNameMapper
 */
function updateJestConfig() {
  const jestConfigPath = path.join(rootDir, 'jest.config.js')
  const jestAliases = getJestAliases()

  const jestConfig = `module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/ai-tests/**/*.test.js'],
  setupFilesAfterEnv: ['./test-setup.js'],
  coveragePathIgnorePatterns: ['/node_modules/', '/migrations/', '/utils/'],
  verbose: true,
  moduleNameMapper: ${JSON.stringify(jestAliases, null, 4).replace(/"/g, "'")},
}
`

  fs.writeFileSync(jestConfigPath, jestConfig)
  console.log('✅ Updated jest.config.js moduleNameMapper')
}

/**
 * Update jsconfig.json paths
 */
function updateJsConfig() {
  const jsConfigPath = path.join(rootDir, 'jsconfig.json')
  const jsConfigAliases = getJsConfigAliases()

  const jsConfig = {
    compilerOptions: {
      baseUrl: '.',
      paths: jsConfigAliases,
    },
  }

  fs.writeFileSync(jsConfigPath, JSON.stringify(jsConfig, null, 2) + '\n')
  console.log('✅ Updated jsconfig.json paths')
}

/**
 * Main function
 */
function main() {
  console.log('🔄 Updating module aliases across configuration files...\n')

  try {
    updatePackageJson()
    updateJestConfig()
    updateJsConfig()

    console.log('\n🎉 All configuration files updated successfully!')
    console.log('\nTo add or modify aliases:')
    console.log('1. Edit config/aliases.js')
    console.log('2. Run: node scripts/update-aliases.js')
  } catch (error) {
    console.error('❌ Error updating configuration files:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = {
  updatePackageJson,
  updateJestConfig,
  updateJsConfig,
}
