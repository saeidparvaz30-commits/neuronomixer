import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { client } from "@/sanity/lib/client";

// Request deletion of an approved post. Sets status to "deletion_requested"
// so an admin can confirm or reject the request.
export async function POST(req: NextRequest) {
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

  await client.patch(postId).set({ status: "deletion_requested" }).commit();

  return NextResponse.json({ success: true });
}
