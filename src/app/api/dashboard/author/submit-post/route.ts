import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { client } from "@/sanity/lib/client";
import { tiptapToPortableText } from "@/lib/tiptapToPortableText";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (role !== "AUTHOR" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = session!.user!.id;

  let body: {
    title?: string;
    categoryId?: string;
    excerpt?: string;
    metaDescription?: string;
    body?: unknown;
    coverImageAssetId?: string;
    action?: "draft" | "submit";
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { title, categoryId, excerpt, metaDescription, body: tiptapBody, coverImageAssetId, action = "submit" } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!categoryId) {
    return NextResponse.json({ error: "Category is required" }, { status: 400 });
  }
  if (!tiptapBody) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }
  if (action === "submit" && !coverImageAssetId) {
    return NextResponse.json({ error: "A header image is required to submit for review." }, { status: 400 });
  }

  // Look up the Sanity author linked to this user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { sanityAuthorId: true },
  });

  // Convert Tiptap JSON → Portable Text
  let portableTextBody: unknown[];
  try {
    portableTextBody = tiptapToPortableText(tiptapBody as Parameters<typeof tiptapToPortableText>[0]);
  } catch (err) {
    console.error("[submit-post] tiptapToPortableText error:", err);
    return NextResponse.json({ error: "Failed to convert content. Please try again." }, { status: 500 });
  }

  // Build slug from title
  const slug = title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 96);

  const doc: Record<string, unknown> = {
    _type: "post",
    title: title.trim(),
    slug: { _type: "slug", current: slug },
    status: action === "draft" ? "draft" : "pending",
    submittedBy: userId,
    description: excerpt?.trim() || undefined,
    ...(metaDescription?.trim() ? { metaDescription: metaDescription.trim().slice(0, 160) } : {}),
    body: portableTextBody,
    category: { _type: "reference", _ref: categoryId },
  };

  if (user?.sanityAuthorId) {
    doc.author = { _type: "reference", _ref: user.sanityAuthorId };
  }

  if (coverImageAssetId) {
    doc.mainImage = {
      _type: "image",
      asset: { _type: "reference", _ref: coverImageAssetId },
    };
  }

  let created: { _id: string };
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    created = await client.create(doc as any);
  } catch (err) {
    console.error("[submit-post] Sanity create error:", err);
    return NextResponse.json({ error: "Failed to save to Sanity. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true, postId: created._id });
}
