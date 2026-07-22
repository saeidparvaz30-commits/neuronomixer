import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { client } from "@/sanity/lib/client";
import { revalidatePath } from "next/cache";

// Admin permanently deletes a post (any status, including deletion_requested).
export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { postId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { postId } = body;
  if (!postId) return NextResponse.json({ error: "Post ID required" }, { status: 400 });

  // Fetch slugs before deletion so we can revalidate the specific cached path
  const postInfo = await client.fetch<{ categorySlug: string; slug: string } | null>(
    `*[_id == $postId][0]{ "categorySlug": category->slug.current, "slug": slug.current }`,
    { postId }
  );

  await client.delete(postId);

  // Purge ISR cache for the deleted post and affected listing pages
  if (postInfo?.categorySlug && postInfo?.slug) {
    revalidatePath(`/blog/${postInfo.categorySlug}/${postInfo.slug}`);
  }
  revalidatePath("/");
  revalidatePath("/blog");

  return NextResponse.json({ success: true });
}
