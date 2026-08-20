import { prisma } from "@/lib/prisma";
import { client } from "@/sanity/lib/client";
import { authorReviewPostsQuery } from "@/sanity/lib/queries";
import { portableTextToMarkdown } from "@/lib/portableTextToMarkdown";
import { hashApiKey } from "@/lib/apiKeyHash";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface SanityPostBodyBlock {
  _type: string;
  alt?: string;
  caption?: string;
  url?: string;
  fileUrl?: string;
  asset?: { url?: string };
}

interface SanityPostListItem {
  id: string;
  title: string;
  slug: string;
  description?: string;
  status: string;
  publishedAt?: string;
  _createdAt: string;
  mainImage?: string | null;
  category?: { title: string; slug: string } | null;
  body: SanityPostBodyBlock[];
}

// Validate key directly (mirrors apiKeyAuth incl. the S7 suspended/role gate)
async function validateKey(key: string | null) {
  if (!key?.startsWith("nnx_")) return null;
  const record = await prisma.authorApiKey.findUnique({
    where: { keyHash: hashApiKey(key) },
    select: {
      userId: true,
      user: { select: { sanityAuthorId: true, role: true, suspended: true } },
    },
  });
  if (!record) return null;
  if (
    record.user.suspended ||
    (record.user.role !== "AUTHOR" && record.user.role !== "ADMIN")
  ) {
    return null;
  }
  return record;
}

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  const record = await validateKey(key ?? null);
  if (!record) notFound();

  const sanityAuthorId = record.user.sanityAuthorId;
  if (!sanityAuthorId) {
    return (
      <pre style={{ fontFamily: "monospace", padding: "2rem" }}>
        No author profile linked to this API key.
      </pre>
    );
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.neuronomixer.com").replace(/\/$/, "");

  const raw = await client.fetch<SanityPostListItem[]>(authorReviewPostsQuery, {
    authorId: sanityAuthorId,
  });

  const posts = raw.map((p) => {
    const { body, ...meta } = p;
    const url = meta.category
      ? `${siteUrl}/blog/${meta.category.slug}/${meta.slug}`
      : null;
    const media: { type: string; url: string; alt?: string; caption?: string }[] = (body ?? [])
      .map((b) => {
        if (b._type === "image") {
          const u = b.asset?.url ?? null;
          return u ? { type: "image", url: u, alt: b.alt ?? "" } : null;
        }
        if (b._type === "video") {
          const u = b.url ?? b.fileUrl ?? null;
          return u ? { type: "video", url: u, caption: b.caption ?? "" } : null;
        }
        return null;
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);
    return { ...meta, url, bodyMarkdown: portableTextToMarkdown(body ?? []), media };
  });

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>NeuroNomixer | Author Content Review</title>
      </head>
      <body style={{ fontFamily: "monospace", whiteSpace: "pre-wrap", padding: "2rem", maxWidth: "900px", margin: "0 auto", lineHeight: "1.6" }}>
        {`NEURONOMIXER — AUTHOR CONTENT REVIEW
Generated: ${new Date().toISOString()}
Total posts: ${posts.length}
${"=".repeat(60)}

`}
        {posts.map((post, i) => (
          <div key={post.id}>
            {`POST ${i + 1} OF ${posts.length}
${"─".repeat(60)}
TITLE:       ${post.title ?? "(untitled)"}
URL:         ${post.url ?? "(no url)"}
STATUS:      ${post.status ?? "unknown"}
PUBLISHED:   ${post.publishedAt ?? post._createdAt ?? "unknown"}
CATEGORY:    ${post.category?.title ?? "none"}
DESCRIPTION: ${post.description ?? "(none)"}

MEDIA (${post.media.length} item${post.media.length !== 1 ? "s" : ""}):
${post.media.length === 0
  ? "  (none)"
  : post.media.map((m) =>
      `  [${m.type.toUpperCase()}] ${m.url}${m.alt ? ` — alt: ${m.alt}` : ""}${m.caption ? ` — caption: ${m.caption}` : ""}`
    ).join("\n")}

BODY:
${post.bodyMarkdown || "(empty)"}

${"=".repeat(60)}

`}
          </div>
        ))}
      </body>
    </html>
  );
}
