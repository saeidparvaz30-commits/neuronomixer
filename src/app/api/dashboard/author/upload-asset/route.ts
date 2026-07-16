import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { client } from "@/sanity/lib/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "AUTHOR" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Cheap first-line guard: reject obviously oversized bodies before buffering
  // the whole request. Uses a 105 MB ceiling (100 MB video cap + multipart
  // overhead); the per-file MIME/size caps below are still authoritative.
  const HARD_MAX_BYTES = 105 * 1024 * 1024;
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > HARD_MAX_BYTES) {
    return NextResponse.json({ error: "File too large. Maximum 100 MB." }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
  const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
  const IMAGE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
  const VIDEO_MAX_BYTES = 100 * 1024 * 1024; // 100 MB

  const isVideo = VIDEO_TYPES.has(file.type);
  if (!isVideo && !IMAGE_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Allowed: JPEG, PNG, WebP, GIF, AVIF images or MP4, WebM, MOV video." },
      { status: 400 }
    );
  }
  const maxBytes = isVideo ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `File too large. Maximum ${isVideo ? "100" : "10"} MB.` },
      { status: 413 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const assetType = isVideo ? "file" : "image";
  const asset = await client.assets.upload(assetType, buffer, {
    filename: file.name,
    contentType: file.type,
  });

  return NextResponse.json({ _id: asset._id, url: asset.url, isVideo: assetType === "file" });
}
