import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

const bodySchema = z.object({
  guideSlug: z.string().min(1).max(200),
  score: z.number().int().min(0).max(100).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = checkRateLimit(`guide-complete:${session.user.id}`, 60, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { guideSlug, score } = parsed.data;

  // Completion is only meaningful for a real, built guide. Rejecting unknown or
  // unbuilt slugs stops arbitrary rows being written from a crafted request.
  const guide = await prisma.visualGuide.findUnique({
    where: { slug: guideSlug },
    select: { implemented: true },
  });
  if (!guide || !guide.implemented) {
    return NextResponse.json({ error: "Unknown guide" }, { status: 404 });
  }

  const completion = await prisma.guideCompletion.upsert({
    where: {
      userId_guideSlug: {
        userId: session.user.id,
        guideSlug,
      },
    },
    update: {
      score: score ?? 0,
      completedAt: new Date(),
    },
    create: {
      userId: session.user.id,
      guideSlug,
      score: score ?? 0,
    },
  });

  return NextResponse.json({ success: true, completion });
}
