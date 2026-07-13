import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { validatePassword } from "@/lib/validatePassword";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();

  if (!token || !password)
    return NextResponse.json({ error: "Token and password required" }, { status: 400 });

  const pwError = validatePassword(password);
  if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });

  const record = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!record || record.expires < new Date())
    return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });

  const hashed = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: record.userId },
    data: { password: hashed, tokenVersion: { increment: 1 } },
  });

  // Invalidate the token
  await prisma.passwordResetToken.delete({ where: { token } });

  return NextResponse.json({ success: true });
}
