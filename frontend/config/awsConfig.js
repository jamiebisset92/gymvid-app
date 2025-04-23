import AWS from 'aws-sdk';

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.S3_BUCKET_NAME;

console.log('🪣 BUCKET NAME CHECK:', BUCKET_NAME);

export { s3, BUCKET_NAME };
