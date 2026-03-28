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

  let body: { title?: string; categoryId?: string; excerpt?: string; body?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { title, categoryId, excerpt, body: tiptapBody } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!categoryId) {
    return NextResponse.json({ error: "Category is required" }, { status: 400 });
  }
  if (!tiptapBody) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  // Look up the Sanity author linked to this user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { sanityAuthorId: true },
  });

  // Convert Tiptap JSON → Portable Text
  const portableTextBody = tiptapToPortableText(tiptapBody as Parameters<typeof tiptapToPortableText>[0]);

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
    status: "pending",
    submittedBy: userId,
    description: excerpt?.trim() || undefined,
    body: portableTextBody,
    category: { _type: "reference", _ref: categoryId },
  };

  if (user?.sanityAuthorId) {
    doc.author = { _type: "reference", _ref: user.sanityAuthorId };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const created = await client.create(doc as any);

  return NextResponse.json({ success: true, postId: created._id });
}
