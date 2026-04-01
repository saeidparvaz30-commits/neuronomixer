import { prisma } from "@/lib/prisma";

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

  const record = await prisma.authorApiKey.findUnique({
    where: { key },
    select: { userId: true, user: { select: { sanityAuthorId: true, role: true } } },
  });
  if (!record) return null;

  // Touch lastUsedAt (fire-and-forget)
  prisma.authorApiKey
    .update({ where: { key }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return {
    userId: record.userId,
    sanityAuthorId: record.user.sanityAuthorId,
  };
}
