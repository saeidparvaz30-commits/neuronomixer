import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { client } from "@/sanity/lib/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { postId?: string; featured?: boolean };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { postId, featured } = body;
  if (!postId || featured === undefined) {
    return NextResponse.json({ error: "postId and featured required" }, { status: 400 });
  }

  // If featuring, unfeature all other posts first so only one is featured at a time
  if (featured) {
    const currentFeatured = await client.fetch<{ _id: string }[]>(
      `*[_type == "post" && featured == true && _id != $id]{ _id }`,
      { id: postId }
    );
    await Promise.all(
      currentFeatured.map((p) => client.patch(p._id).set({ featured: false }).commit())
    );
  }

  await client.patch(postId).set({ featured }).commit();
  return NextResponse.json({ success: true });
}
