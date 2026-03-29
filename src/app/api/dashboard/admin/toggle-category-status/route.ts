import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { client } from "@/sanity/lib/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { categoryId?: string; active?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { categoryId, active } = body;
  if (!categoryId) return NextResponse.json({ error: "categoryId required" }, { status: 400 });
  if (typeof active !== "boolean") return NextResponse.json({ error: "active required" }, { status: 400 });

  await client.patch(categoryId).set({ active }).commit();
  return NextResponse.json({ success: true });
}
