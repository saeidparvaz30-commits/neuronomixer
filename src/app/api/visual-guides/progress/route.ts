import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ completions: [] });
  }

  const completions = await prisma.guideCompletion.findMany({
    where: { userId: session.user.id },
    select: { guideSlug: true, score: true, completedAt: true },
  });

  return NextResponse.json({ completions });
}
