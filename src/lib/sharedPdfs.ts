import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { SharedPdf } from "@prisma/client";

/** Headers every share-facing response must carry (SEO isolation + no caching of tokened content). */
export const NOINDEX_HEADERS = {
  "X-Robots-Tag": "noindex",
  "Cache-Control": "private, no-store",
} as const;

/** 128-bit link secret, base64url, 22 chars. */
export function generateShareToken(): string {
  return randomBytes(16).toString("base64url");
}

/** ASCII-safe download filename stem; falls back so Farsi-only titles still get a usable name. */
export function slugifyFilename(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "document";
}

/** Null when the token is unknown OR the share is disabled: both must 404 identically. */
export async function getActiveShare(token: string): Promise<SharedPdf | null> {
  const share = await prisma.sharedPdf.findUnique({ where: { token } });
  return share && share.active ? share : null;
}
