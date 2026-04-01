import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/apiKeyAuth";
import { client } from "@/sanity/lib/client";
import { markdownToPortableText, uploadMainImage } from "@/lib/markdownToPortableText";
import { portableTextToMarkdown } from "@/lib/portableTextToMarkdown";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// ── GET /api/v1/posts ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const user = await authenticateApiKey(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401, headers: CORS });
  }

  if (!user.sanityAuthorId) {
    return NextResponse.json({ posts: [] }, { headers: CORS });
  }

  const raw = await client.fetch(
    `*[_type == "post" && author._ref == $authorId] | order(coalesce(publishedAt, _createdAt) desc) {
      "id": _id,
      title,
      "slug": slug.current,
      description,
      status,
      publishedAt,
      _createdAt,
      "mainImage": mainImage.asset->url,
      "category": category->{ title, "slug": slug.current },
      "url": select(
        defined(category) => $siteUrl + "/blog/" + category->slug.current + "/" + slug.current,
        null
      ),
      body[]{
        ...,
        _type == "image" => { ..., "asset": asset->{ "url": url } },
        _type == "video" => { ..., "fileUrl": file.asset->url }
      }
    }`,
    { authorId: user.sanityAuthorId, siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "" }
  );

  const posts = raw.map((p: any) => {
    const { body, ...meta } = p;

    // Flat manifest of all images and videos in the body
    const media = (body ?? [])
      .map((b: any) => {
        if (b._type === "image") {
          const url = b.asset?.url ?? null;
          return url ? { type: "image" as const, url, alt: b.alt ?? null } : null;
        }
        if (b._type === "video") {
          const url = b.url ?? b.fileUrl ?? null;
          return url
            ? { type: "video" as const, url, caption: b.caption ?? null, source: b.source ?? "external" }
            : null;
        }
        return null;
      })
      .filter(Boolean);

    return {
      ...meta,
      bodyMarkdown: portableTextToMarkdown(body ?? []),
      media,
    };
  });

  return NextResponse.json({ posts }, { headers: CORS });
}

// ── POST /api/v1/posts ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const user = await authenticateApiKey(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401, headers: CORS });
  }

  if (!user.sanityAuthorId) {
    return NextResponse.json(
      { error: "Your author profile is not yet linked. Complete your profile first." },
      { status: 403, headers: CORS }
    );
  }

  let body: {
    title?: string;
    description?: string;
    metaDescription?: string; // SEO meta description (max 160 chars)
    category?: string;        // category slug
    body?: string;            // markdown
    mainImageUrl?: string;    // public image URL for the header image
    publishedAt?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: CORS });
  }

  const { title, description, metaDescription, category: categorySlug, body: markdown, mainImageUrl } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400, headers: CORS });
  }
  if (!markdown?.trim()) {
    return NextResponse.json({ error: "body (markdown) is required" }, { status: 400, headers: CORS });
  }
  if (!categorySlug?.trim()) {
    return NextResponse.json({ error: "category slug is required" }, { status: 400, headers: CORS });
  }

  // Look up category
  const category = await client.fetch<{ _id: string } | null>(
    `*[_type == "category" && slug.current == $slug][0]{ _id }`,
    { slug: categorySlug }
  );
  if (!category) {
    return NextResponse.json(
      { error: `Category "${categorySlug}" not found. Use GET /api/v1/categories to list available categories.` },
      { status: 400, headers: CORS }
    );
  }

  // Run markdown conversion and optional image upload in parallel
  const [portableBody, mainImageAsset] = await Promise.all([
    markdownToPortableText(markdown),
    mainImageUrl ? uploadMainImage(mainImageUrl) : Promise.resolve(null),
  ]);

  const doc = await client.create({
    _type: "post",
    title: title.trim(),
    description: description?.trim() ?? "",
    ...(metaDescription?.trim() && { metaDescription: metaDescription.trim().slice(0, 160) }),
    slug: {
      _type: "slug",
      current: title
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .slice(0, 96),
    },
    author: { _type: "reference", _ref: user.sanityAuthorId },
    category: { _type: "reference", _ref: category._id },
    ...(mainImageAsset ? { mainImage: mainImageAsset } : {}),
    body: portableBody,
    status: "pending",
    submittedBy: user.userId,
    publishedAt: body.publishedAt ?? new Date().toISOString(),
  });

  return NextResponse.json(
    { success: true, postId: doc._id, message: "Post submitted for admin review." },
    { status: 201, headers: CORS }
  );
}
