import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Google,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        captchaToken: { label: "Captcha Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Verify reCAPTCHA if secret key is configured
        const secret = process.env.RECAPTCHA_SECRET_KEY;
        if (secret && credentials.captchaToken) {
          try {
            const captchaRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({ secret, response: credentials.captchaToken as string }),
            });
            const captchaData = await captchaRes.json();
            // Only hard-block if Google explicitly flags it as a bot (score < 0.1).
            // score < 0.3 was too aggressive — first-attempt submissions often score
            // low because reCAPTCHA has had minimal time to observe user behaviour.
            if (captchaData.success === true && (captchaData.score ?? 1) < 0.1) return null;
          } catch {
            // Network error reaching Google — let the login proceed; don't punish
            // valid users for transient failures.
          }
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user || !user.password) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!valid) return null;
        if (user.suspended) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Block Google OAuth sign-in for suspended accounts
      if (!user?.id) return true;
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { suspended: true },
      });
      if (dbUser?.suspended) return false;
      return true;
    },
    async jwt({ token, user, trigger }) {
      // On first sign-in OR forced update, load full user data from DB
      if (user?.id || trigger === "update") {
        const userId = (user?.id ?? token.id) as string;
        const dbUser = await prisma.user.findUnique({ where: { id: userId } });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.vip = dbUser.vip;
          token.onboarded = dbUser.onboarded;
          token.suspended = dbUser.suspended;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).vip = token.vip;
        (session.user as any).onboarded = token.onboarded;
      }
      return session;
    },
  },
});
