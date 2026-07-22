import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidSlug } from "@/lib/validateSlug";

const db = prisma;

const MIGRATION_PENDING = () => NextResponse.json(
  { error: "Feature not available yet — run `prisma migrate dev`" },
  { status: 503 }
);

export async function POST(req: NextRequest) {
  if (!db.bookmark) return MIGRATION_PENDING();

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postSlug, postTitle, categorySlug } = await req.json();
  if (!isValidSlug(postSlug) || !isValidSlug(categorySlug)) {
    return NextResponse.json({ error: "Invalid postSlug or categorySlug" }, { status: 400 });
  }
  if (typeof postTitle !== "string" || postTitle.trim().length === 0 || postTitle.length > 300) {
    return NextResponse.json({ error: "Invalid postTitle" }, { status: 400 });
  }

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
  if (!isValidSlug(postSlug)) {
    return NextResponse.json({ error: "Invalid postSlug" }, { status: 400 });
  }

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
