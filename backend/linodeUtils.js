const s3 = require('./utils/s3')
const secrets = require('./secrets')
const shortUUID = require('short-uuid')
const db = require('./db_connection')

const uploadData = async ({ dataBuffer, linodePath, fileName, fileExtension, uploadType }) => {
  const uploadId = shortUUID.generate()

  if (!fileName) {
    fileName = uploadId + (fileExtension ? `.${fileExtension}` : '.txt')
  }

  const result = await s3.uploadData({
    data: dataBuffer,
    key: linodePath + fileName,
    bucket: secrets.LINODE_BUCKET_NAME,
    contentType: s3.inferContentType(fileName),
  })

  console.log('Upload successful:', result)

  await db('uploads').insert({
    id: uploadId,
    url: result.publicUrl,
    filename: fileName,
    upload_type: uploadType || 'unknown',
  })

  return {
    id: uploadId,
    url: result.publicUrl,
    filename: fileName,
  }
}

const testUpload = async () => {
  const dataBuffer = Buffer.from('Hello, Linode S3!')
  const linodePath = 'test/'

  const result = await uploadData({
    dataBuffer,
    linodePath,
    // fileName,
    fileExtension: 'txt',
    uploadType: 'test',
  })
  console.log('Upload result:', result)
}

if (require.main === module) {
  testUpload().then(() => {
    console.log('Test upload completed')
    process.exit(0)
  })
}

module.exports = { uploadData }
