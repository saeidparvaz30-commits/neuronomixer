import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const db = prisma as any;

const MIGRATION_PENDING = () => NextResponse.json(
  { error: "Feature not available yet — run `prisma migrate dev`" },
  { status: 503 }
);

export async function POST(req: NextRequest) {
  if (!db.like) return MIGRATION_PENDING();

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postSlug } = await req.json();
  if (!postSlug) return NextResponse.json({ error: "postSlug required" }, { status: 400 });

  await db.like.upsert({
    where: { userId_postSlug: { userId: session.user.id, postSlug } },
    create: { userId: session.user.id, postSlug },
    update: {},
  });

  const count = await db.like.count({ where: { postSlug } });
  return NextResponse.json({ liked: true, count });
}

export async function DELETE(req: NextRequest) {
  if (!db.like) return MIGRATION_PENDING();

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postSlug } = await req.json();
  if (!postSlug) return NextResponse.json({ error: "postSlug required" }, { status: 400 });

  await db.like.deleteMany({ where: { userId: session.user.id, postSlug } });

  const count = await db.like.count({ where: { postSlug } });
  return NextResponse.json({ liked: false, count });
}

export async function GET(req: NextRequest) {
  if (!db.like) return NextResponse.json({ count: 0, liked: false });

  const { searchParams } = new URL(req.url);
  const postSlug = searchParams.get("postSlug");
  if (!postSlug) return NextResponse.json({ error: "postSlug required" }, { status: 400 });

  const session = await auth();
  const [count, userLike] = await Promise.all([
    db.like.count({ where: { postSlug } }),
    session?.user
      ? db.like.findUnique({
          where: { userId_postSlug: { userId: session.user.id, postSlug } },
        })
      : null,
  ]);

  return NextResponse.json({ count, liked: !!userLike });
}
