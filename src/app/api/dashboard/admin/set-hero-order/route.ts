import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { client } from "@/sanity/lib/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { postId?: string; heroOrder?: number | null };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { postId, heroOrder } = body;
  if (!postId) {
    return NextResponse.json({ error: "postId required" }, { status: 400 });
  }
  if (heroOrder !== null && heroOrder !== undefined && ![1, 2, 3].includes(heroOrder)) {
    return NextResponse.json({ error: "heroOrder must be 1, 2, 3, or null" }, { status: 400 });
  }

  // If assigning a slot, clear that slot from any other post first
  if (heroOrder != null) {
    const existing = await client.fetch<{ _id: string }[]>(
      `*[_type == "post" && heroOrder == $order && _id != $id]{ _id }`,
      { order: heroOrder, id: postId }
    );
    await Promise.all(
      existing.map((p) => client.patch(p._id).unset(["heroOrder"]).commit())
    );
    await client.patch(postId).set({ heroOrder }).commit();
  } else {
    // Clear the slot for this post
    await client.patch(postId).unset(["heroOrder"]).commit();
  }

  return NextResponse.json({ success: true });
}
