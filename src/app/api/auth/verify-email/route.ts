import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const record = await prisma.verificationToken.findUnique({ where: { token } });

  if (!record || record.expires < new Date()) {
    return NextResponse.json({ error: "Invalid or expired verification link" }, { status: 400 });
  }

  // identifier is "verify:{email}"
  const email = record.identifier.replace(/^verify:/, "");

  await prisma.user.updateMany({
    where: { email },
    data: { emailVerified: new Date() },
  });

  await prisma.verificationToken.delete({ where: { token } });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return NextResponse.redirect(`${siteUrl}/auth/verify-email?verified=1`);
}
