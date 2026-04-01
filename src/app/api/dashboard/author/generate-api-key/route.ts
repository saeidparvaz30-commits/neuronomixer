import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "AUTHOR" && role !== "ADMIN") {
    return NextResponse.json({ error: "Authors only" }, { status: 403 });
  }

  const key = "nnx_" + crypto.randomBytes(24).toString("hex");

  await prisma.authorApiKey.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, key },
    update: { key, lastUsedAt: null },
  });

  return NextResponse.json({ key });
}
