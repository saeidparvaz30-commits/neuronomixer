import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const { postSlug, postTitle, categorySlug, authorName } = await req.json();

  if (!postSlug || !postTitle || !categorySlug) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // One counted view per IP+slug per 30 min (anti-inflation, S13).
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(`track-read:${ip}:${postSlug}`, 1, 30 * 60 * 1000);
  if (rl.allowed) {
    await prisma.postView.create({ data: { postSlug } });
  }

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
