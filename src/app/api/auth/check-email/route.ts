import { NextRequest, NextResponse } from "next/server";
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

  // Always return the same answer regardless of account state so this endpoint
  // cannot be used to enumerate registered / unverified accounts (S10).
  return NextResponse.json({ verified: true });
}
