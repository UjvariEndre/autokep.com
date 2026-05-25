import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type R2Config = {
  client: S3Client;
  bucket: string;
};

let cached: R2Config | null = null;

function getR2(): R2Config {
  if (cached) return cached;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "R2 env változók hiányoznak: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME",
    );
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  cached = { client, bucket };
  return cached;
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSec = 300,
): Promise<string> {
  const { client, bucket } = getR2();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn: expiresInSec });
}

export async function getPresignedDownloadUrl(
  key: string,
  expiresInSec = 3600,
  downloadFilename?: string,
): Promise<string> {
  const { client, bucket } = getR2();
  // If downloadFilename is set, embed Content-Disposition: attachment in the
  // signed URL so the browser downloads instead of rendering. RFC 5987 form
  // (filename*=UTF-8''...) keeps Hungarian characters working safely.
  const responseContentDisposition = downloadFilename
    ? `attachment; filename*=UTF-8''${encodeURIComponent(downloadFilename)}`
    : undefined;
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentDisposition: responseContentDisposition,
  });
  return getSignedUrl(client, command, { expiresIn: expiresInSec });
}

export async function uploadBuffer(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  const { client, bucket } = getR2();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
}

export async function deleteObject(key: string): Promise<void> {
  const { client, bucket } = getR2();
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}

/** Returns true if the object exists in the bucket (HEAD request). */
export async function objectExists(key: string): Promise<boolean> {
  const { client, bucket } = getR2();
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function downloadObject(key: string): Promise<Buffer> {
  const { client, bucket } = getR2();
  const response = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  const body = response.Body;
  if (!body) {
    throw new Error(`R2 object üres: ${key}`);
  }
  const stream = body as unknown as AsyncIterable<Uint8Array>;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
