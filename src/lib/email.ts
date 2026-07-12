import crypto from "crypto";
import { prisma } from "./prisma";
import { createMailTransport } from "./mailer";

export async function sendVerificationEmail(email: string): Promise<void> {
  const identifier = `verify:${email}`;
  await prisma.verificationToken.deleteMany({ where: { identifier } });

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await prisma.verificationToken.create({ data: { identifier, token, expires } });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const verifyUrl = `${siteUrl}/api/auth/verify-email?token=${token}`;

  const transporter = createMailTransport();

  await transporter.sendMail({
    from: `"NeuroNomixer" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Verify your NeuroNomixer email",
    text: `Click the link to verify your email (valid 24 hours):\n\n${verifyUrl}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:12px;padding:32px">
        <h2 style="color:#d4af37;margin:0 0 8px">Verify your email</h2>
        <p style="color:#94a3b8;margin:0 0 24px">Welcome to NeuroNomixer! Click the button below to confirm your email address and activate your account.</p>
        <p style="margin:24px 0">
          <a href="${verifyUrl}" style="background:#1e5d8a;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">
            Verify Email
          </a>
        </p>
        <p style="font-size:0.85em;color:#64748b">Or copy this link into your browser:<br>
          <a href="${verifyUrl}" style="color:#3bb4a4;word-break:break-all">${verifyUrl}</a>
        </p>
        <p style="font-size:0.8em;color:#475569;margin-top:24px;border-top:1px solid #1e293b;padding-top:16px">
          This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
