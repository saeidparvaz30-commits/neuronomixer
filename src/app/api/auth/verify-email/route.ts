import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { token } = await req.json().catch(() => ({ token: null }));

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record || record.expires < new Date()) {
    return NextResponse.json({ error: "Invalid or expired verification link" }, { status: 400 });
  }

  const email = record.identifier.replace(/^verify:/, "");
  await prisma.user.updateMany({ where: { email }, data: { emailVerified: new Date() } });
  await prisma.verificationToken.delete({ where: { token } });

  return NextResponse.json({ success: true });
}
