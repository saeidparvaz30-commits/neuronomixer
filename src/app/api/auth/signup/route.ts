import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { checkRateLimit } from "@/lib/rateLimit";

async function sendVerificationEmail(userId: string, email: string) {
  // Remove any old token for this user+identifier
  const identifier = `verify:${email}`;
  await prisma.verificationToken.deleteMany({ where: { identifier } });

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await prisma.verificationToken.create({ data: { identifier, token, expires } });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const verifyUrl = `${siteUrl}/auth/verify-email?token=${token}`;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: `"NeuroNomixer" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Verify your NeuroNomixer email",
    text: `Click the link to verify your email (valid 24 hours):\n\n${verifyUrl}`,
    html: `
      <p>Welcome to NeuroNomixer!</p>
      <p>Click the button below to verify your email address.</p>
      <p style="margin:24px 0">
        <a href="${verifyUrl}" style="background:#1e5d8a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
          Verify Email
        </a>
      </p>
      <p>Or copy this link: <a href="${verifyUrl}">${verifyUrl}</a></p>
      <p style="color:#888;font-size:0.85em">This link expires in 24 hours.</p>
    `,
  });
  void userId; // stored for future use
}

async function verifyCaptcha(token?: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return true; // Skip if not configured
  if (!token) return false;

  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token }),
  });
  const data = await res.json().catch(() => ({ success: false }));
  return data.success === true && (data.score ?? 1) >= 0.3;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(`signup:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many signup attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  const { email, password, role, captchaToken } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const captchaOk = await verifyCaptcha(captchaToken);
  if (!captchaOk) {
    return NextResponse.json(
      { error: "Captcha verification failed. Please try again." },
      { status: 403 }
    );
  }

  const validRole = role === "AUTHOR" ? "AUTHOR" : "SUBSCRIBER";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      role: validRole,
      onboarded: false,
    },
  });

  // Send verification email (fire-and-forget — don't block signup on SMTP failure)
  sendVerificationEmail(user.id, email).catch((err) =>
    console.error("[signup] verification email error:", err)
  );

  return NextResponse.json({ success: true });
}
