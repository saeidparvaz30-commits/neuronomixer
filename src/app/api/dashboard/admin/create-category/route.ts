import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { client } from "@/sanity/lib/client";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { title?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { title, description } = body;
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const doc = {
    _type: "category",
    title: title.trim(),
    slug: { _type: "slug", current: slugify(title.trim()) },
    ...(description?.trim() ? { description: description.trim() } : {}),
    active: true,
  };

  const created = await client.create(doc);
  return NextResponse.json({ success: true, id: created._id });
}
