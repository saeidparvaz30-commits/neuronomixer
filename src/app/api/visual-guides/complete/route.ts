import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { guideSlug, score } = body;

  if (!guideSlug || typeof guideSlug !== "string") {
    return NextResponse.json({ error: "Invalid guideSlug" }, { status: 400 });
  }

  const completion = await prisma.guideCompletion.upsert({
    where: {
      userId_guideSlug: {
        userId: session.user.id,
        guideSlug,
      },
    },
    update: {
      score: typeof score === "number" ? score : 0,
      completedAt: new Date(),
    },
    create: {
      userId: session.user.id,
      guideSlug,
      score: typeof score === "number" ? score : 0,
    },
  });

  return NextResponse.json({ success: true, completion });
}
