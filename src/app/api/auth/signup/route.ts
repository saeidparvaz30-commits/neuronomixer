import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { client } from "@/sanity/lib/client";
import bcrypt from "bcryptjs";
import { sendVerificationEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rateLimit";
import { validatePassword } from "@/lib/validatePassword";

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
  const pwError = validatePassword(password);
  if (pwError) {
    return NextResponse.json({ error: pwError }, { status: 400 });
  }

  const captchaOk = await verifyCaptcha(captchaToken);
  if (!captchaOk) {
    return NextResponse.json(
      { error: "Captcha verification failed. Please try again." },
      { status: 403 }
    );
  }

  const isAuthor = role === "AUTHOR";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const hashed = await bcrypt.hash(password, 12);

  // Authors start as SUBSCRIBER + PENDING so they can't publish until approved
  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      role: "SUBSCRIBER",
      authorStatus: isAuthor ? "PENDING" : null,
      onboarded: false,
    },
  });

  // Immediately create a Sanity author application so the admin can review it
  if (isAuthor) {
    try {
      const emailSlug = email
        .toLowerCase()
        .replace(/@/g, "-at-")
        .replace(/\./g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .slice(0, 64);

      const doc = await client.create({
        _type: "author",
        name: email, // placeholder — replaced when user completes profile
        slug: { _type: "slug", current: emailSlug },
        email,
        userId: user.id,
        applicationStatus: "pending",
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { sanityAuthorId: doc._id },
      });
    } catch (err) {
      console.error("[signup] Failed to create author application:", err);
      // authorStatus is already PENDING in Prisma — admin can create Sanity doc manually
    }
  }

  // Send verification email after the response. A bare fire-and-forget promise
  // gets frozen with the serverless function and often never completes; after()
  // keeps the function alive until the send settles without delaying signup.
  after(() =>
    sendVerificationEmail(email).catch((err) =>
      console.error("[signup] verification email error:", err)
    )
  );

  // Add to Brevo newsletter list (same freeze problem as above)
  const brevoKey = process.env.BREVO_API_KEY;
  const brevoList = process.env.BREVO_LIST_ID;
  if (brevoKey && brevoList) {
    after(() =>
      fetch("https://api.brevo.com/v3/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": brevoKey },
        body: JSON.stringify({ email, listIds: [Number(brevoList)], updateEnabled: true }),
      }).catch((err) => console.error("[signup] Brevo add error:", err))
    );
  }

  return NextResponse.json({ success: true });
}
