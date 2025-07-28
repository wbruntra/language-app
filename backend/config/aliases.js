/**
 * Centralized module alias configuration
 * This file defines all module aliases used across the project
 */

const path = require('path')

const rootDir = path.resolve(__dirname, '..')

// Define the aliases once
const bareAliases = {
  '@tables': 'tables',
  '@utils': 'utils',
  '@routes': 'routes',
  '@middleware': 'middleware',
  '@config': 'config.js',
  '@db_connection': 'db_connection.js',
  '@secrets': 'secrets.js',
  '@lib': 'lib',
}

const aliasesRelativePath = Object.fromEntries(
  Object.entries(bareAliases).map(([alias, relativePath]) => {
    // Convert to relative path from root
    // const fullPath = path.join(rootDir, relativePath)

    return [alias, `./${relativePath}`]
  }),
)

const aliasesFullPath = Object.fromEntries(
  Object.entries(bareAliases).map(([alias, relativePath]) => {
    // Convert to full path from root
    const fullPath = path.join(rootDir, relativePath)

    return [alias, fullPath]
  }),
)

/**
 * Get aliases in the format expected by package.json _moduleAliases
 */
function getPackageAliases() {
  return aliasesRelativePath
}

/**
 * Get aliases in the format expected by Jest moduleNameMapper
 */
function getJestAliases() {
  const jestAliases = {}

  Object.entries(bareAliases).forEach(([alias, relativePath]) => {
    // Check if the target path is a single file (ends with .js)
    const isFile = relativePath.endsWith('.js')

    // Convert alias to Jest regex format
    const aliasKey = isFile
      ? `^${alias.replace('@', '\\@')}$`
      : `^${alias.replace('@', '\\@')}/(.*)$`

    // Convert to <rootDir> relative format for Jest
    const aliasValue = isFile ? `<rootDir>/${relativePath}` : `<rootDir>/${relativePath}/$1`

    jestAliases[aliasKey] = aliasValue
  })

  return jestAliases
}

/**
 * Get aliases in the format expected by jsconfig.json paths
 */
function getJsConfigAliases() {
  const jsConfigAliases = {}

  Object.entries(aliasesFullPath).forEach(([alias, fullPath]) => {
    // Convert to relative path from root
    const relativePath = path.relative(rootDir, fullPath)

    // Check if the target path is a single file (ends with .js)
    const isFile = fullPath.endsWith('.js')

    if (isFile) {
      jsConfigAliases[alias] = [relativePath]
    } else {
      jsConfigAliases[`${alias}/*`] = [`${relativePath}/*`]
    }
  })

  return jsConfigAliases
}

console.log('Module aliases configured:', JSON.stringify(aliasesRelativePath, null, 2))
console.log('Full path aliases:', JSON.stringify(aliasesFullPath, null, 2))

module.exports = {
  aliases: aliasesFullPath,
  getPackageAliases,
  getJestAliases,
  getJsConfigAliases,
}
