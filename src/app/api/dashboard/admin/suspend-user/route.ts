import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const session = await auth();
  const adminId = session?.user?.id;

  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { userId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { userId } = body;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  if (userId === adminId) return NextResponse.json({ error: "Cannot suspend your own account" }, { status: 400 });

  const user = await (prisma as any).user.update({
    where: { id: userId },
    data: { suspended: true, tokenVersion: { increment: 1 } },
    select: { name: true, email: true },
  });

  // Send email notification
  if (user.email) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://neuronomixer.com";

      await transporter.sendMail({
        from: `"NeuroNomixer" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: "Your NeuroNomixer account has been deactivated",
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1e293b">
            <h2 style="color:#d4af37">NeuroNomixer</h2>
            <p>Hi ${user.name ?? "there"},</p>
            <p>Your NeuroNomixer account has been <strong>deactivated</strong> by an administrator. You will no longer be able to sign in.</p>
            <p>If you believe this is a mistake or would like to appeal, please reach out to us:</p>
            <p style="margin:24px 0">
              <a href="${siteUrl}/contact" style="background:#d4af37;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
                Contact Us
              </a>
            </p>
            <p style="color:#94a3b8;font-size:13px">NeuroNomixer — ${siteUrl}</p>
          </div>
        `,
      });
    } catch (e) {
      console.error("Failed to send suspension email:", e);
      // Non-fatal — account is still suspended
    }
  }

  return NextResponse.json({ success: true });
}
