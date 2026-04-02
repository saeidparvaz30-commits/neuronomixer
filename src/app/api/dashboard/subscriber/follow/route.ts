import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — check follow status
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ following: false });

  const { searchParams } = new URL(req.url);
  const sanityId = searchParams.get("sanityId");
  const type = searchParams.get("type") ?? "author";
  if (!sanityId) return NextResponse.json({ error: "sanityId required" }, { status: 400 });

  const follow = await prisma.follow.findUnique({
    where: { userId_type_sanityId: { userId: session.user.id, type, sanityId } },
  });

  return NextResponse.json({ following: !!follow });
}

// POST — follow
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, sanityId } = await req.json();

  if (!type || !sanityId) {
    return NextResponse.json({ error: "type and sanityId required" }, { status: 400 });
  }

  await prisma.follow.upsert({
    where: { userId_type_sanityId: { userId: session.user.id, type, sanityId } },
    create: { userId: session.user.id, type, sanityId },
    update: {},
  });

  return NextResponse.json({ success: true });
}

// DELETE — unfollow
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, sanityId } = await req.json();

  if (!type || !sanityId) {
    return NextResponse.json({ error: "type and sanityId required" }, { status: 400 });
  }

  await prisma.follow.deleteMany({
    where: { userId: session.user.id, type, sanityId },
  });

  return NextResponse.json({ success: true });
}
