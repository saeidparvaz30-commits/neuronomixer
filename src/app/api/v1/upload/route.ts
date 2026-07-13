import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/apiKeyAuth";
import { client } from "@/sanity/lib/client";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// ── POST /api/v1/upload ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const user = await authenticateApiKey(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401, headers: CORS });
  }

  const HARD_MAX_BYTES = 11 * 1024 * 1024; // 10 MB image cap + multipart overhead
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > HARD_MAX_BYTES) {
    return NextResponse.json({ error: "File too large. Maximum 10 MB." }, { status: 413, headers: CORS });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data. Send a multipart/form-data request with a 'file' field." }, { status: 400, headers: CORS });
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "No file provided. Include an image file in the 'file' field." }, { status: 400, headers: CORS });
  }

  const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
  const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

  if (!IMAGE_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP, GIF, or AVIF images are supported." },
      { status: 400, headers: CORS }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large. Maximum 10 MB." },
      { status: 413, headers: CORS }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const asset = await client.assets.upload("image", buffer, {
      filename: file.name,
      contentType: file.type,
    });
    return NextResponse.json({ url: asset.url, assetId: asset._id }, { headers: CORS });
  } catch {
    return NextResponse.json({ error: "Failed to upload image." }, { status: 500, headers: CORS });
  }
}
