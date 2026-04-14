import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

// Returns whether a credentials-based account exists and is verified.
// Used by the sign-in page to show a targeted "verify your email" message
// instead of the generic "invalid credentials" error.
export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(`check-email:${ip}`, 10, 60 * 1000);
  if (!rl.allowed) {
    // Don't leak that the limit was hit — just return verified to avoid giving info
    return NextResponse.json({ verified: true });
  }

  const email = new URL(req.url).searchParams.get("email");
  if (!email) return NextResponse.json({ verified: true });

  const user = await prisma.user.findUnique({
    where: { email },
    select: { emailVerified: true, password: true },
  });

  // Only reveal unverified status for password-based accounts (not OAuth-only users)
  if (user?.password && !user.emailVerified) {
    return NextResponse.json({ verified: false });
  }

  return NextResponse.json({ verified: true });
}
