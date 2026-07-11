import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "@/lib/env";

/**
 * AWS S3 storage (T-041). Stores UI/UX reference image uploads and generated
 * zips. Backend only (server-only). The browser uploads bytes directly to S3
 * via a short-lived presigned PUT — bytes never proxy through the function.
 */

let cachedClient: S3Client | null = null;

function getClient(): S3Client {
  if (cachedClient) return cachedClient;
  if (!process.env.AWS_ACCESS_KEY_ID) {
    throw new Error("Storage not configured: set AWS_REGION / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY.");
  }
  // SDK auto-reads AWS_REGION / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY.
  cachedClient = new S3Client({});
  return cachedClient;
}

function bucket(): string {
  if (!env.S3_BUCKET) throw new Error("S3_BUCKET is not set.");
  return env.S3_BUCKET;
}

/** A short-lived presigned PUT URL the browser uses to upload directly to S3. */
export async function presignPut(
  key: string,
  contentType: string,
  expiresIn = 300,
): Promise<{ url: string; expiresIn: number }> {
  const url = await getSignedUrl(
    getClient(),
    new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType }),
    { expiresIn },
  );
  return { url, expiresIn };
}

/** Stream an object out of S3 (used by the zip export, T-045). */
export async function getObject(key: string) {
  const res = await getClient().send(
    new GetObjectCommand({ Bucket: bucket(), Key: key }),
  );
  return res.Body;
}

/** Upload bytes from the server (e.g. a cached zip). */
export async function putObject(
  key: string,
  body: Uint8Array | Buffer | string,
  contentType: string,
): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

/** Public URL for an uploaded object (for reference display). */
export function publicUrl(key: string): string {
  const base = env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "") ?? "";
  return `${base}/${key}`;
}
