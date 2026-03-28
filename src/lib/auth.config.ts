// Edge-compatible auth config — used ONLY in middleware.
// No Prisma, no Node.js crypto. JWT verification only.
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

export const authConfig = {
  providers: [
    Google,
    // Credentials stub — authorize always returns null here;
    // the real authorize() lives in auth.ts (Node.js only).
    Credentials({ credentials: {}, authorize: async () => null }),
  ],
  pages: {
    signIn: "/auth/sign-in",
    newUser: "/auth/complete-signup",
  },
  callbacks: {
    jwt({ token }) {
      return token;
    },
    session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).onboarded = token.onboarded;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
