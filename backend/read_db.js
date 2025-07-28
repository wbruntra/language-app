const knex = require('./db_connection')
const config = require('./config')
const fs = require('fs')
const path = require('path')

// Function to get table DDL using PostgreSQL information schema
const getTableDdl = async (tableName) => {
  try {
    // Get column information
    const columnsResult = await knex.raw(
      `
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        numeric_precision,
        numeric_scale,
        is_nullable,
        column_default,
        ordinal_position
      FROM information_schema.columns
      WHERE table_name = ? AND table_schema = 'public'
      ORDER BY ordinal_position
    `,
      [tableName],
    )

    // Get primary key information
    const primaryKeyResult = await knex.raw(
      `
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_name = ? 
        AND tc.table_schema = 'public'
      ORDER BY kcu.ordinal_position
    `,
      [tableName],
    )

    // Get foreign key information
    const foreignKeysResult = await knex.raw(
      `
      SELECT 
        kcu.column_name,
        ccu.table_name AS referenced_table_name,
        ccu.column_name AS referenced_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = ?
        AND tc.table_schema = 'public'
    `,
      [tableName],
    )

    // Get unique constraints
    const uniqueConstraintsResult = await knex.raw(
      `
      SELECT 
        tc.constraint_name,
        string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'UNIQUE'
        AND tc.table_name = ? 
        AND tc.table_schema = 'public'
      GROUP BY tc.constraint_name
    `,
      [tableName],
    )

    const columns = columnsResult.rows
    const primaryKeys = primaryKeyResult.rows.map((row) => row.column_name)
    const foreignKeys = foreignKeysResult.rows
    const uniqueConstraints = uniqueConstraintsResult.rows

    // Build CREATE TABLE statement
    let ddl = `CREATE TABLE ${tableName} (\n`

    // Add columns
    const columnDefinitions = columns.map((col) => {
      let def = `    ${col.column_name} `

      // Add data type
      if (col.character_maximum_length) {
        def += `${col.data_type}(${col.character_maximum_length})`
      } else if (col.numeric_precision && col.numeric_scale) {
        def += `${col.data_type}(${col.numeric_precision},${col.numeric_scale})`
      } else if (col.numeric_precision) {
        def += `${col.data_type}(${col.numeric_precision})`
      } else {
        def += col.data_type
      }

      // Add NOT NULL
      if (col.is_nullable === 'NO') {
        def += ' NOT NULL'
      }

      // Add default value
      if (col.column_default) {
        def += ` DEFAULT ${col.column_default}`
      }

      return def
    })

    ddl += columnDefinitions.join(',\n')

    // Add primary key constraint
    if (primaryKeys.length > 0) {
      ddl += `,\n    PRIMARY KEY (${primaryKeys.join(', ')})`
    }

    // Add unique constraints
    uniqueConstraints.forEach((constraint) => {
      ddl += `,\n    CONSTRAINT ${constraint.constraint_name} UNIQUE (${constraint.columns})`
    })

    // Add foreign key constraints
    foreignKeys.forEach((fk) => {
      ddl += `,\n    CONSTRAINT ${fk.constraint_name} FOREIGN KEY (${fk.column_name}) REFERENCES ${fk.referenced_table_name}(${fk.referenced_column_name})`
    })

    ddl += '\n);'

    return ddl
  } catch (error) {
    throw new Error(`Failed to generate DDL for table ${tableName}: ${error.message}`)
  }
}

// Function to get tables that reference the current table
const getReferencedBy = async (tableName) => {
  const result = await knex.raw(
    `
    SELECT 
      tc.table_name, 
      kcu.column_name, 
      tc.constraint_name
    FROM 
      information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND ccu.table_name = ?
      AND tc.table_schema = 'public'
  `,
    [tableName],
  )

  return result.rows || []
}

// Function to get tables that this table references
const getReferences = async (tableName) => {
  const result = await knex.raw(
    `
    SELECT 
      ccu.table_name AS referenced_table_name, 
      kcu.column_name, 
      tc.constraint_name
    FROM 
      information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name = ?
      AND tc.table_schema = 'public'
  `,
    [tableName],
  )

  return result.rows || []
}

const hashLogic = (tableName) => {
  if (!config.hashPrefixes[tableName]) return ''

  const hashPrefix = config.hashPrefixes[tableName]

  return `
  static encodeId(id) {
    return toHash(id, '${hashPrefix}')
  }

  static decodeId(hash) {
    return deHash(hash, '${hashPrefix}')
  }
`
}

const generateModelFile = async (tableName) => {
  const hashLogicResult = hashLogic(tableName)

  try {
    const filePath = path.join(__dirname, 'tables', `${tableName}.js`)
    const ddl = await getTableDdl(tableName)

    // Get relationship information
    const referencedBy = await getReferencedBy(tableName)
    const references = await getReferences(tableName)

    // Create the reference information text
    let referenceInfo = ''

    if (referencedBy.length > 0) {
      referenceInfo += '\n\n-- Referenced by:'
      referencedBy.forEach((ref) => {
        referenceInfo += `\n-- * ${ref.table_name}.${ref.column_name} (${ref.constraint_name})`
      })
    }

    if (references.length > 0) {
      referenceInfo += '\n\n-- References:'
      references.forEach((ref) => {
        referenceInfo += `\n-- * ${ref.referenced_table_name} via ${ref.column_name} (${ref.constraint_name})`
      })
    }

    // Combine DDL and reference info
    const fullDdl = ddl + referenceInfo

    if (fs.existsSync(filePath)) {
      // Update existing file
      let content = fs.readFileSync(filePath, 'utf8')
      let lines = content.split('\n')

      const startMarker = '* BEGIN_DDL'
      const endMarker = '* END_DDL'

      let startIndex = lines.findIndex((line) => line.includes(startMarker))
      if (startIndex === -1) {
        console.error(
          `DDL start marker not found in ${filePath}. Cannot update. Consider deleting the file and regenerating.`,
        )
        return
      }

      let endIndex = lines.findIndex((line) => line.includes(endMarker))
      if (endIndex === -1) {
        console.error(`DDL end marker not found in ${filePath}. Cannot update.`)
        return
      }

      if (endIndex <= startIndex) {
        console.error(`Invalid marker positions in ${filePath}. Cannot update.`)
        return
      }

      // New DDL content lines (raw DDL + reference info split)
      const newDdlLines = fullDdl.split('\n')

      // Create new lines array with updated DDL
      const newLines = lines.slice(0, startIndex + 1).concat(newDdlLines, lines.slice(endIndex))

      // Join back into a string and write to file
      const newContent = newLines.join('\n')
      fs.writeFileSync(filePath, newContent)
      console.log(`Updated ${filePath}`)
    } else {
      // Generate new file
      const fileContent = `/**
 * ${tableName} Table DDL:
 * BEGIN_DDL
${fullDdl.split('\n').join('\n')}
 * END_DDL
 */
const { Model } = require('objection')
const knex = require('@db_connection')
${hashLogicResult ? `const { toHash, deHash } = require('@utils/hashids')\n` : ''}

// Initialize knex connection for all models
if (!Model.knex()) {
  Model.knex(knex)
}

class ${tableNameToClassName(tableName)} extends Model {
  static get tableName() {
    return '${tableName}'
  }
  ${hashLogic(tableName)}

  // TODO: Add jsonSchema based on DDL above
  // TODO: Add relationMappings if needed
}

module.exports = ${tableNameToClassName(tableName)}
`
      fs.writeFileSync(filePath, fileContent)
      console.log(`Generated ${filePath}`)
    }
  } catch (error) {
    console.error(`Error processing table ${tableName}:`, error.message)
  }
}

const tableNameToClassName = (tableName) => {
  return tableName
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

const run = async () => {
  // Create tables directory if it doesn't exist
  const tablesDir = path.join(__dirname, 'tables')
  if (!fs.existsSync(tablesDir)) {
    fs.mkdirSync(tablesDir)
  }

  // Get a list of all the tables in the database using PostgreSQL syntax
  const db_tables = await knex.raw(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
  `)

  const tableNames = db_tables.rows.map((row) => row.table_name)

  console.log('Table names:', tableNames)

  // Process all tables
  for (const tableName of tableNames) {
    await generateModelFile(tableName)
  }

  console.log('Finished generating all model files')
}

run()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
