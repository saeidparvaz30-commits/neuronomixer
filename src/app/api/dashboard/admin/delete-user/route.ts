import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { client } from "@/sanity/lib/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  const adminId = session?.user?.id;

  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { userId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { userId } = body;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  // Prevent admin from deleting themselves
  if (userId === adminId) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  // Fetch sanityAuthorId before deleting the Prisma user
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { sanityAuthorId: true },
  });

  // Delete Prisma user (cascades to Account, Session, Follow)
  await prisma.user.delete({ where: { id: userId } });

  // Delete linked Sanity author document (posts are intentionally left intact)
  if (dbUser?.sanityAuthorId) {
    try {
      await client.delete(dbUser.sanityAuthorId);
    } catch {
      // Sanity doc may already be gone — not fatal
    }
  }

  return NextResponse.json({ success: true });
}
