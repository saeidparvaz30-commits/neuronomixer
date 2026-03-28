import "next-auth";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "AUTHOR" | "SUBSCRIBER";
      vip: boolean;
      onboarded: boolean;
    } & DefaultSession["user"];
  }
}
