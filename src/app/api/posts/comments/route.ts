import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const db = prisma as any;

export async function GET(req: NextRequest) {
  if (!db.comment) return NextResponse.json([]);

  const { searchParams } = new URL(req.url);
  const postSlug = searchParams.get("postSlug");
  if (!postSlug) return NextResponse.json({ error: "postSlug required" }, { status: 400 });

  const comments = await db.comment.findMany({
    where: { postSlug },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { name: true, image: true, role: true } } },
  });

  return NextResponse.json(comments);
}

export async function POST(req: NextRequest) {
  if (!db.comment)
    return NextResponse.json(
      { error: "Feature not available yet — run `prisma migrate dev`" },
      { status: 503 }
    );

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postSlug, body } = await req.json();
  if (!postSlug || !body?.trim())
    return NextResponse.json({ error: "postSlug and body required" }, { status: 400 });

  if (body.trim().length > 2000)
    return NextResponse.json({ error: "Comment too long (max 2000 chars)" }, { status: 400 });

  const comment = await db.comment.create({
    data: { userId: session.user.id, postSlug, body: body.trim() },
    include: { user: { select: { name: true, image: true, role: true } } },
  });

  return NextResponse.json(comment, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  if (!db.comment) return NextResponse.json({ error: "Feature not available yet" }, { status: 503 });

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { commentId } = await req.json();
  if (!commentId) return NextResponse.json({ error: "commentId required" }, { status: 400 });

  const comment = await db.comment.findUnique({ where: { id: commentId } });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const role = (session.user as any).role;
  if (comment.userId !== session.user.id && role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.comment.delete({ where: { id: commentId } });
  return NextResponse.json({ success: true });
}
