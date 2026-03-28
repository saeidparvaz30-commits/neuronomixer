import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

// Use the edge-compatible config (no Prisma, no Node.js crypto)
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const role = (session?.user as any)?.role;
  const onboarded = (session?.user as any)?.onboarded;

  // Protect admin routes
  if (pathname.startsWith("/dashboard/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/auth/sign-in", req.url));
  }

  // Protect author routes
  if (
    pathname.startsWith("/dashboard/author") &&
    role !== "AUTHOR" &&
    role !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL("/auth/sign-in", req.url));
  }

  // Protect subscriber routes
  if (pathname.startsWith("/dashboard/subscriber") && !session?.user) {
    return NextResponse.redirect(new URL("/auth/sign-in", req.url));
  }

  // onboarded check is handled in src/app/dashboard/layout.tsx (Prisma, always fresh)
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
