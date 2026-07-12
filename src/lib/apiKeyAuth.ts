import { prisma } from "@/lib/prisma";
import { hashApiKey } from "@/lib/apiKeyHash";

export type ApiKeyUser = {
  userId: string;
  sanityAuthorId: string | null;
};

/** Validates Bearer API key from Authorization header. Returns null if invalid. */
export async function authenticateApiKey(
  authHeader: string | null
): Promise<ApiKeyUser | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const key = authHeader.slice(7).trim();
  if (!key.startsWith("nnx_")) return null;
  const keyHash = hashApiKey(key);

  const record = await prisma.authorApiKey.findUnique({
    where: { keyHash },
    select: {
      userId: true,
      user: { select: { sanityAuthorId: true, role: true, suspended: true } },
    },
  });
  if (!record) return null;
  // Revoke access for suspended users and anyone no longer an author/admin (S7).
  if (
    record.user.suspended ||
    (record.user.role !== "AUTHOR" && record.user.role !== "ADMIN")
  ) {
    return null;
  }

  // Touch lastUsedAt (fire-and-forget)
  prisma.authorApiKey
    .update({ where: { keyHash }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return {
    userId: record.userId,
    sanityAuthorId: record.user.sanityAuthorId,
  };
}
