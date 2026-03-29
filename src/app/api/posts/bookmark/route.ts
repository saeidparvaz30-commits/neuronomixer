import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const db = prisma as any;

const MIGRATION_PENDING = () => NextResponse.json(
  { error: "Feature not available yet — run `prisma migrate dev`" },
  { status: 503 }
);

export async function POST(req: NextRequest) {
  if (!db.bookmark) return MIGRATION_PENDING();

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postSlug, postTitle, categorySlug } = await req.json();
  if (!postSlug || !postTitle || !categorySlug)
    return NextResponse.json({ error: "postSlug, postTitle, categorySlug required" }, { status: 400 });

  await db.bookmark.upsert({
    where: { userId_postSlug: { userId: session.user.id, postSlug } },
    create: { userId: session.user.id, postSlug, postTitle, categorySlug },
    update: {},
  });

  return NextResponse.json({ bookmarked: true });
}

export async function DELETE(req: NextRequest) {
  if (!db.bookmark) return MIGRATION_PENDING();

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postSlug } = await req.json();
  if (!postSlug) return NextResponse.json({ error: "postSlug required" }, { status: 400 });

  await db.bookmark.deleteMany({ where: { userId: session.user.id, postSlug } });

  return NextResponse.json({ bookmarked: false });
}

export async function GET(req: NextRequest) {
  if (!db.bookmark) return NextResponse.json({ bookmarked: false });

  const session = await auth();
  if (!session?.user) return NextResponse.json({ bookmarked: false });

  const { searchParams } = new URL(req.url);
  const postSlug = searchParams.get("postSlug");
  if (!postSlug) return NextResponse.json({ error: "postSlug required" }, { status: 400 });

  const bm = await db.bookmark.findUnique({
    where: { userId_postSlug: { userId: session.user.id, postSlug } },
  });

  return NextResponse.json({ bookmarked: !!bm });
}
