const db = require('../db_connection')
const fs = require('fs')
const path = require('path')

const getData = async (query, params = []) => {
  const data = await db('ai_usage')

  fs.writeFileSync(path.join(__dirname, 'ai_usage.json'), JSON.stringify(data, null, 2))
}

getData().then(() => {
  process.exit(0)
})
