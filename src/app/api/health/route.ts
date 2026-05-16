import { NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HealthResponse = {
  db: "ok" | "error";
  r2: "ok" | "error";
  userCount: number | null;
  objectCount: number | null;
  errors: { db?: string; r2?: string };
};

async function checkDb(): Promise<{ ok: boolean; count: number | null; error?: string }> {
  try {
    const count = await prisma.user.count();
    return { ok: true, count };
  } catch (err) {
    return {
      ok: false,
      count: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function checkR2(): Promise<{ ok: boolean; count: number | null; error?: string }> {
  try {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET_NAME;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error("R2 env változók hiányoznak");
    }
    if (accessKeyId.startsWith("__") || secretAccessKey.startsWith("__")) {
      throw new Error("R2 kulcsok placeholder értéken vannak");
    }

    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    const result = await client.send(new ListObjectsV2Command({ Bucket: bucket }));
    return { ok: true, count: result.KeyCount ?? 0 };
  } catch (err) {
    return {
      ok: false,
      count: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function GET() {
  const [db, r2] = await Promise.all([checkDb(), checkR2()]);

  const body: HealthResponse = {
    db: db.ok ? "ok" : "error",
    r2: r2.ok ? "ok" : "error",
    userCount: db.count,
    objectCount: r2.count,
    errors: {
      ...(db.error ? { db: db.error } : {}),
      ...(r2.error ? { r2: r2.error } : {}),
    },
  };

  const status = db.ok && r2.ok ? 200 : 503;
  return NextResponse.json(body, { status });
}
