import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { client } from "@/sanity/lib/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { postId?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { postId } = body;
  if (!postId) return NextResponse.json({ error: "postId required" }, { status: 400 });

  await client.patch(postId).set({ status: "approved" }).commit();
  return NextResponse.json({ success: true });
}
