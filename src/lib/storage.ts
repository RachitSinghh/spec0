import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "@/lib/env";

/**
 * Cloudflare R2 storage (T-041). S3-compatible: an S3Client pointed at the R2
 * endpoint. Stores UI/UX reference image uploads and generated zips. Backend
 * only (server-only). The browser uploads bytes directly to R2 via a
 * short-lived presigned PUT — bytes never proxy through the function.
 */

let cachedClient: S3Client | null = null;

function getClient(): S3Client {
  if (cachedClient) return cachedClient;
  if (
    !env.R2_ACCOUNT_ID ||
    !env.R2_ACCESS_KEY_ID ||
    !env.R2_SECRET_ACCESS_KEY
  ) {
    throw new Error("R2 storage is not configured (set R2_* env vars).");
  }
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
  return cachedClient;
}

function bucket(): string {
  if (!env.R2_BUCKET) throw new Error("R2_BUCKET is not set.");
  return env.R2_BUCKET;
}

/** A short-lived presigned PUT URL the browser uses to upload directly to R2. */
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

/** Stream an object out of R2 (used by the zip export, T-045). */
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
  const base = env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "") ?? "";
  return `${base}/${key}`;
}
