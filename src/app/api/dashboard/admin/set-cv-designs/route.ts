import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, generationsUsed } = await req.json();
  if (!userId || typeof generationsUsed !== "number" || generationsUsed < 0) {
    return NextResponse.json({ error: "userId and valid generationsUsed required" }, { status: 400 });
  }

  // Upsert: create the AuthorCV row if it doesn't exist yet
  await prisma.authorCV.upsert({
    where: { userId },
    update: { designGenerationsUsed: generationsUsed },
    create: { userId, designGenerationsUsed: generationsUsed },
  });

  return NextResponse.json({ success: true });
}
