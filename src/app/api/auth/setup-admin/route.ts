import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const { email, password, name, setupSecret } = await req.json();

  // Verify setup secret first — always return the same error to avoid leaking info
  const expectedSecret = process.env.ADMIN_SETUP_SECRET;
  if (!expectedSecret || setupSecret !== expectedSecret) {
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
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
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
