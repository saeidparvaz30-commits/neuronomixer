import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  // Silent no-op for unauthenticated users — not an error
  if (!session?.user) return NextResponse.json({ ok: true });

  const { postSlug, postTitle, categorySlug, authorName } = await req.json();

  if (!postSlug || !postTitle || !categorySlug) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Upsert so revisits just update the timestamp
  await prisma.readingHistory.upsert({
    where: { userId_postSlug: { userId: session.user.id, postSlug } },
    create: { userId: session.user.id, postSlug, postTitle, categorySlug, authorName },
    update: { readAt: new Date(), postTitle },
  });

  return NextResponse.json({ ok: true });
}
