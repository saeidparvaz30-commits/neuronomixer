import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { client } from "@/sanity/lib/client";
import { tiptapToPortableText } from "@/lib/tiptapToPortableText";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (role !== "AUTHOR" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = session!.user!.id;

  let body: {
    postId?: string;
    title?: string;
    categoryId?: string;
    excerpt?: string;
    metaDescription?: string;
    body?: unknown;
    coverImageAssetId?: string | null;
    action?: "draft" | "submit";
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { postId, title, categoryId, body: tiptapBody, excerpt, metaDescription, coverImageAssetId, action = "submit" } = body;

  if (!postId) return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
  if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!categoryId) return NextResponse.json({ error: "Category is required" }, { status: 400 });
  if (!tiptapBody) return NextResponse.json({ error: "Content is required" }, { status: 400 });

  // Verify ownership — only the submitter (or admin) can edit
  const existing = await client.fetch<{ _id: string; submittedBy: string } | null>(
    `*[_type == "post" && _id == $postId][0]{ _id, submittedBy }`,
    { postId }
  );

  if (!existing) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (role !== "ADMIN" && existing.submittedBy !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const newStatus = action === "draft" ? "draft" : "pending";

  const slug = title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 96);

  const portableTextBody = tiptapToPortableText(
    tiptapBody as Parameters<typeof tiptapToPortableText>[0]
  );

  const patch = client.patch(postId).set({
    title: title.trim(),
    slug: { _type: "slug", current: slug },
    status: newStatus,
    description: excerpt?.trim() || "",
    body: portableTextBody,
    category: { _type: "reference", _ref: categoryId },
    ...(metaDescription?.trim()
      ? { metaDescription: metaDescription.trim().slice(0, 160) }
      : {}),
  });

  if (coverImageAssetId) {
    patch.set({
      mainImage: {
        _type: "image",
        asset: { _type: "reference", _ref: coverImageAssetId },
      },
    });
  } else if (coverImageAssetId === null) {
    patch.unset(["mainImage"]);
  }

  await patch.commit();

  return NextResponse.json({ success: true });
}
