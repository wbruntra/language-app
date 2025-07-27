const db = require('./db_connection')

const run = async () => {
  const uploads = await db('uploads').select('*')
  console.log('All uploads:', uploads)
}

run()
  .then(() => {
    console.log('Uploads fetched successfully')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Error fetching uploads:', err)
  })
