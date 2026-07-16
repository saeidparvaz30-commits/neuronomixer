// prisma.config.ts — Prisma 7 configuration file (used by Prisma CLI only)
import { defineConfig } from "prisma/config";
import { config } from "dotenv";

// Load .env so Prisma CLI has access to DIRECT_URL
config({ path: ".env" });

const directUrl = process.env.DIRECT_URL!;

// DIRECT_URL: non-pooled connection required for migrations (Supabase port 5432).
// PrismaConfig (@prisma/config 7.5.0) has no `migrate.adapter` field, so the CLI
// connects directly via `datasource.url` for migrate/introspect commands.
export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: directUrl,
  },
  migrations: {
    seed: "tsx prisma/seed-guides.ts",
  },
});
