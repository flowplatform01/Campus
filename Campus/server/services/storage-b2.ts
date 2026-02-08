import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "../config.js";
import { randomUUID } from "crypto";

let s3Client: S3Client | null = null;

function getClient() {
  if (!s3Client) {
    if (!config.b2.keyId || !config.b2.appKey || !config.b2.endpoint) {
      throw new Error("Backblaze B2 is not configured");
    }
    s3Client = new S3Client({
      region: config.b2.region,
      endpoint: config.b2.endpoint,
      credentials: {
        accessKeyId: config.b2.keyId,
        secretAccessKey: config.b2.appKey,
      },
      forcePathStyle: true,
    });
  }
  return s3Client;
}

export async function uploadToB2(
  buffer: Buffer,
  key: string,
  contentType?: string
): Promise<string> {
  const client = getClient();
  const bucket = config.b2.bucket;
  if (!bucket) throw new Error("B2 bucket not configured");
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return key;
}

export async function getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const client = getClient();
  const bucket = config.b2.bucket;
  if (!bucket) throw new Error("B2 bucket not configured");
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, cmd, { expiresIn });
}

export async function deleteFromB2(key: string): Promise<void> {
  const client = getClient();
  const bucket = config.b2.bucket;
  if (!bucket) throw new Error("B2 bucket not configured");
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/**
 * For private files (assignments, documents): upload to B2, store key in DB.
 * For public assets (logos, avatars): upload to B2, optionally store base64/optimized
 * URL in Neon per newPrompt - since B2 free doesn't support public URLs.
 * We store the B2 key; generate signed URLs when needed for display.
 */
export function generateKey(prefix: string, ext: string): string {
  return `${prefix}/${randomUUID()}${ext}`;
}
