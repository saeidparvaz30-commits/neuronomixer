import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { checkRateLimit } from "@/lib/rateLimit";
import { validatePassword } from "@/lib/validatePassword";

export async function POST(req: Request) {
  const { email, password, name, setupSecret } = await req.json();

  // Throttle by IP so the secret cannot be brute-forced before the first admin exists (S9).
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(`setup-admin:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  // Constant-time secret comparison (avoids the timing side-channel of !==).
  const expectedSecret = process.env.ADMIN_SETUP_SECRET;
  const providedOk =
    !!expectedSecret &&
    typeof setupSecret === "string" &&
    Buffer.byteLength(setupSecret) === Buffer.byteLength(expectedSecret) &&
    crypto.timingSafeEqual(Buffer.from(setupSecret), Buffer.from(expectedSecret));
  if (!providedOk) {
    return NextResponse.json({ error: "Invalid setup secret." }, { status: 403 });
  }

  // Block if any admin already exists
  const existingAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });
  if (existingAdmin) {
    return NextResponse.json(
      { error: "An admin account already exists. Sign in instead." },
      { status: 403 }
    );
  }

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

  const hashed = await bcrypt.hash(password, 12);

  // Upsert: update existing user with this email, or create new one
  await prisma.user.upsert({
    where: { email },
    update: {
      password: hashed,
      role: "ADMIN",
      onboarded: true,
      name: name || "Admin",
    },
    create: {
      email,
      password: hashed,
      role: "ADMIN",
      onboarded: true,
      name: name || "Admin",
    },
  });

  return NextResponse.json({ success: true });
}
