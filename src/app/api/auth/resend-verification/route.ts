import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(`resend-verify:${ip}`, 3, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a few minutes before trying again." },
      { status: 429 }
    );
  }

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required." }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { email },
    select: { emailVerified: true, password: true },
  });

  // Silently succeed even if email not found or already verified (prevent enumeration)
  if (!user || !user.password || user.emailVerified) {
    return NextResponse.json({ success: true });
  }

  try {
    await sendVerificationEmail(email);
  } catch (err) {
    console.error("[resend-verification] email error:", err);
    return NextResponse.json(
      { error: "Failed to send email. Please try again later." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
