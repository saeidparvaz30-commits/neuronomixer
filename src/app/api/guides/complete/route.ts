import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

const bodySchema = z.object({
  slugs: z.array(z.string().max(200)).min(1).max(50),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = checkRateLimit(`guide-complete-bulk:${session.user.id}`, 20, 60_000);
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

  const userId = session.user.id;
  const uniqueSlugs = [...new Set(parsed.data.slugs)];

  // Only record completions for slugs that are real, built guides. This is the
  // anonymous-pending flush path, so an attacker could otherwise inject junk
  // slugs that inflate admin completion counts.
  const realGuides = await prisma.visualGuide.findMany({
    where: { slug: { in: uniqueSlugs }, implemented: true },
    select: { slug: true },
  });
  const validSlugs = realGuides.map((g) => g.slug);

  if (validSlugs.length > 0) {
    await prisma.guideCompletion.createMany({
      data: validSlugs.map((guideSlug) => ({ userId, guideSlug })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ ok: true, recorded: validSlugs.length });
}
