import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { client } from "@/sanity/lib/client";

const VALID_ROLES = ["ADMIN", "AUTHOR", "SUBSCRIBER"] as const;
type Role = (typeof VALID_ROLES)[number];

export async function POST(req: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { userId?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { userId, role } = body;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  if (!role || !VALID_ROLES.includes(role as Role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // When upgrading to AUTHOR, also mark authorStatus as APPROVED
  const data: Record<string, unknown> = { role };
  if (role === "AUTHOR") data.authorStatus = "APPROVED";
  if (role === "SUBSCRIBER") data.authorStatus = null;

  const user = await (prisma as any).user.update({ where: { id: userId }, data, select: { sanityAuthorId: true } });

  // Keep Sanity author document in sync with role changes.
  // We try sanityAuthorId first; if missing, fall back to querying Sanity by userId.
  const sanityStatus = role === "AUTHOR" ? "approved" : "revoked";
  let sanityDocId: string | null = user?.sanityAuthorId ?? null;

  if (!sanityDocId) {
    // Fallback: find the Sanity author document by userId field
    const doc = await client.fetch<{ _id: string } | null>(
      `*[_type == "author" && userId == $uid][0]{ _id }`,
      { uid: userId }
    ).catch(() => null);
    sanityDocId = doc?._id ?? null;
  }

  if (sanityDocId) {
    await client.patch(sanityDocId).set({ applicationStatus: sanityStatus }).commit().catch(() => {});
    // Also save the id back to Prisma so future calls skip the GROQ lookup
    if (!user?.sanityAuthorId && sanityDocId) {
      await (prisma as any).user.update({ where: { id: userId }, data: { sanityAuthorId: sanityDocId } }).catch(() => {});
    }
  }

  return NextResponse.json({ success: true });
}
