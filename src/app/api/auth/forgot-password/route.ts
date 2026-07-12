import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { checkRateLimit } from "@/lib/rateLimit";
import { createMailTransport } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(`forgot-password:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ success: true }); // Silent to prevent enumeration
  }

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  // Always return success to prevent email enumeration
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password) {
    // No account or OAuth-only account — return success silently
    return NextResponse.json({ success: true });
  }

  // Delete any existing token for this user
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  // Create a new token valid for 1 hour
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expires },
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const resetUrl = `${siteUrl}/auth/reset-password?token=${token}`;

  const transporter = createMailTransport();

  await transporter.sendMail({
    from: `"NeuroNomixer" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Reset your NeuroNomixer password",
    text: `Click the link below to reset your password (valid for 1 hour):\n\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
    html: `
      <p>Hi${user.name ? ` ${user.name}` : ""},</p>
      <p>Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
      <p style="margin:24px 0">
        <a href="${resetUrl}" style="background:#1e5d8a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
          Reset Password
        </a>
      </p>
      <p>Or copy this link: <a href="${resetUrl}">${resetUrl}</a></p>
      <p style="color:#888;font-size:0.85em">If you didn't request a password reset, you can safely ignore this email.</p>
    `,
  });

  return NextResponse.json({ success: true });
}
