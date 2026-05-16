const REMOVEBG_URL = "https://api.remove.bg/v1.0/removebg";

export type RemoveBgErrorCode =
  | "NO_CREDITS"
  | "RATE_LIMIT"
  | "BAD_IMAGE"
  | "UNAUTHORIZED"
  | "UNKNOWN";

export class RemoveBgError extends Error {
  readonly status: number;
  readonly code: RemoveBgErrorCode;

  constructor(status: number, code: RemoveBgErrorCode, message: string) {
    super(message);
    this.name = "RemoveBgError";
    this.status = status;
    this.code = code;
  }
}

function classifyStatus(status: number): {
  code: RemoveBgErrorCode;
  message: string;
} {
  switch (status) {
    case 400:
      return {
        code: "BAD_IMAGE",
        message: "A feltöltött kép nem feldolgozható (400).",
      };
    case 401:
    case 403:
      return {
        code: "UNAUTHORIZED",
        message: "remove.bg API kulcs érvénytelen vagy hiányzik.",
      };
    case 402:
      return {
        code: "NO_CREDITS",
        message: "Nincs elég remove.bg kredit (402).",
      };
    case 429:
      return {
        code: "RATE_LIMIT",
        message: "remove.bg rate limit elérve (429).",
      };
    default:
      return {
        code: "UNKNOWN",
        message: `remove.bg ismeretlen hiba (${status}).`,
      };
  }
}

export type RemoveBgSize = "preview" | "full" | "auto";

export async function removeCarBackground(
  imageBuffer: Buffer,
  options?: { size?: RemoveBgSize },
): Promise<Buffer> {
  const apiKey = process.env.REMOVEBG_API_KEY;
  if (!apiKey) {
    throw new Error("REMOVEBG_API_KEY env változó hiányzik.");
  }

  const form = new FormData();
  const blob = new Blob([new Uint8Array(imageBuffer)], {
    type: "application/octet-stream",
  });
  form.append("image_file", blob, "image");
  form.append("type", "car");
  form.append("format", "png");
  form.append("bg_color", "");
  if (options?.size) form.append("size", options.size);

  const response = await fetch(REMOVEBG_URL, {
    method: "POST",
    headers: { "X-Api-Key": apiKey },
    body: form,
  });

  if (!response.ok) {
    const { code, message } = classifyStatus(response.status);
    console.error(`[removebg] status=${response.status} code=${code}`);
    throw new RemoveBgError(response.status, code, message);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
