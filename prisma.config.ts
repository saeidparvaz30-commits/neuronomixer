// @ts-nocheck
// prisma.config.ts — Prisma 7 configuration file (used by Prisma CLI only)
import { defineConfig } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

// Load .env so Prisma CLI has access to DIRECT_URL
config({ path: ".env" });

const directUrl = process.env.DIRECT_URL!;

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: directUrl,
  },
  migrate: {
    // DIRECT_URL: non-pooled connection required for migrations (Supabase port 5432)
    adapter: () => new PrismaPg({ connectionString: directUrl }),
  },
  migrations: {
    seed: "tsx prisma/seed-guides.ts",
  },
});
