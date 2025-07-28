const db = require('./db_connection')

const run = async () => {
  // const uploads = await db('user_info').select('*')
  // console.log('All uploads:', uploads)

  await db('user_info')
    .update({
      first_name: 'William',
    })
    .where({
      email: 'bill@test.com',
    })
}

run()
  .then(() => {
    console.log('Uploads fetched successfully')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Error fetching uploads:', err)
  })
