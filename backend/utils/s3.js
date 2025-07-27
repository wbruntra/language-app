const S3Utils = require('linode-s3-utils')
const secrets = require('../secrets')

const s3 = new S3Utils({
  region: secrets.LINODE_BUCKET_REGION,
  accessKeyId: secrets.LINODE_S3_ACCESS_KEY,
  secretAccessKey: secrets.LINODE_S3_SECRET_KEY,
})

module.exports = s3
