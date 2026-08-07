import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// same required-env-var pattern we've used throughout the project
function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set in environment variables`);
  }
  return value;
}

const B2_ENDPOINT = getRequiredEnv("B2_ENDPOINT");
const B2_ACCESS_KEY_ID = getRequiredEnv("B2_ACCESS_KEY_ID");
const B2_SECRET_ACCESS_KEY = getRequiredEnv("B2_SECRET_ACCESS_KEY");
const B2_BUCKET_NAME = getRequiredEnv("B2_BUCKET_NAME");

// the S3 client, configured to point at Backblaze B2 instead of real AWS —
// this works because B2 implements the same S3 API surface
const s3Client = new S3Client({
  endpoint: B2_ENDPOINT,
  region: "auto", // B2/R2-style providers generally accept "auto" here
  credentials: {
    accessKeyId: B2_ACCESS_KEY_ID,
    secretAccessKey: B2_SECRET_ACCESS_KEY,
  },
});

interface UploadFileParams {
  key: string; // the file's path/name inside the bucket, e.g. "employees/abc-123/cv.pdf"
  body: Buffer;
  contentType: string; // e.g. "application/pdf", "image/jpeg"
}

// uploads a file buffer to B2, returns the storage key (not a public URL,
// since the bucket is private — we generate temporary signed URLs to view files instead)
export async function uploadFile(params: UploadFileParams): Promise<string> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: B2_BUCKET_NAME,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    }),
  );

  return params.key;
}

// generates a temporary, time-limited URL to view/download a private file —
// since the bucket isn't public, this is the only way to actually access a file
export async function getSignedFileUrl(
  key: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: B2_BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}
