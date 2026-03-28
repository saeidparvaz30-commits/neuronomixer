import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
