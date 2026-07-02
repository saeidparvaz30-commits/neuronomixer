import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  slugs: z
    .array(z.string().max(200))
    .min(1)
    .max(50),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const uniqueSlugs = [...new Set(parsed.data.slugs)];
  const userId = session.user.id;

  await prisma.guideCompletion.createMany({
    data: uniqueSlugs.map((guideSlug) => ({ userId, guideSlug })),
    skipDuplicates: true,
  });

  return NextResponse.json({ ok: true, recorded: uniqueSlugs.length });
}
