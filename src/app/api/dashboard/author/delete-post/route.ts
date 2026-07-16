import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { client } from "@/sanity/lib/client";

// Permanently delete a draft / pending / rejected post owned by the author.
// Approved posts must go through request-delete instead.
export async function DELETE(req: NextRequest) {
  const session = await auth();
  const role = session?.user?.role;

  if (role !== "AUTHOR" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = session!.user!.id;

  let body: { postId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { postId } = body;
  if (!postId) return NextResponse.json({ error: "Post ID required" }, { status: 400 });

  const post = await client.fetch<{ _id: string; submittedBy: string; status: string } | null>(
    `*[_type == "post" && _id == $postId][0]{ _id, submittedBy, status }`,
    { postId }
  );

  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (role !== "ADMIN" && post.submittedBy !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (post.status === "approved") {
    return NextResponse.json(
      { error: "Approved posts require admin approval to delete. Use request-delete instead." },
      { status: 409 }
    );
  }

  await client.delete(postId);

  return NextResponse.json({ success: true });
}
