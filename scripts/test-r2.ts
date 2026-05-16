import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

import { uploadBuffer, deleteObject, getPresignedDownloadUrl } from "../src/lib/r2";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

async function main() {
  const accountId = process.env.R2_ACCOUNT_ID!;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;
  const bucket = process.env.R2_BUCKET_NAME!;

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  const listed = await client.send(new ListObjectsV2Command({ Bucket: bucket }));
  console.log(`[list] bucket=${bucket} keyCount=${listed.KeyCount ?? 0}`);

  const key = `__healthcheck/${Date.now()}.txt`;
  const payload = Buffer.from("autokep r2 round-trip ok\n", "utf8");
  await uploadBuffer(key, payload, "text/plain");
  console.log(`[put]  ${key} (${payload.length} B)`);

  const url = await getPresignedDownloadUrl(key, 60);
  console.log(`[sign] presigned GET (60s) ${url.slice(0, 80)}...`);

  await deleteObject(key);
  console.log(`[del]  ${key}`);

  console.log("[ok]   R2 list + put + presign + delete all work");
}

main().catch((err) => {
  console.error("[fail]", err);
  process.exit(1);
});
