import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { client } from "@/sanity/lib/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { sanityAuthorId, userId } = await req.json();

  if (!sanityAuthorId) {
    return NextResponse.json({ error: "sanityAuthorId required" }, { status: 400 });
  }

  await client
    .patch(sanityAuthorId)
    .set({ applicationStatus: "rejected" })
    .commit();

  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { authorStatus: "REJECTED" },
    });
  }

  return NextResponse.json({ success: true });
}
