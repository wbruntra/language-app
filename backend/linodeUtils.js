const s3 = require('./utils/s3')
const secrets = require('./secrets')
const shortUUID = require('short-uuid')
const db = require('./db_connection')

const uploadData = async ({ dataBuffer, linodePath, fileName, uploadType }) => {
  const result = await s3.uploadData({
    data: dataBuffer,
    key: linodePath + fileName,
    bucket: secrets.LINODE_BUCKET_NAME,
    contentType: s3.inferContentType(fileName),
  })

  console.log('Upload successful:', result)

  // Save the upload information to the database
  const uploadId = shortUUID.generate()

  await db('uploads').insert({
    id: uploadId,
    url: result.publicUrl,
    filename: fileName,
    upload_type: uploadType || 'unknown',
  })

  return result
}

const testUpload = async () => {
  const dataBuffer = Buffer.from('Hello, Linode S3!')
  const linodePath = 'test/'
  const fileName = 'test-file.txt'

  const result = await uploadData({ dataBuffer, linodePath, fileName, uploadType: 'test' })
  console.log('Upload result:', result)
}

if (require.main === module) {
  testUpload().then(() => {
    console.log('Test upload completed')
    process.exit(0)
  })
}

module.exports = { uploadData }
