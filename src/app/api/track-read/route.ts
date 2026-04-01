import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { postSlug, postTitle, categorySlug, authorName } = await req.json();

  if (!postSlug || !postTitle || !categorySlug) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Always record a view — works for anonymous and authenticated users
  await prisma.postView.create({ data: { postSlug } });

  // Record reading history only for authenticated users
  const session = await auth();
  if (session?.user) {
    await prisma.readingHistory.upsert({
      where: { userId_postSlug: { userId: session.user.id, postSlug } },
      create: { userId: session.user.id, postSlug, postTitle, categorySlug, authorName },
      update: { readAt: new Date(), postTitle },
    });
  }

  return NextResponse.json({ ok: true });
}
