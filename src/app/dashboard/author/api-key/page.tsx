import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ApiKeyClient from "./ApiKeyClient";

export default async function ApiKeyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/sign-in");

  const role = (session.user as any).role;
  if (role !== "AUTHOR" && role !== "ADMIN") redirect("/dashboard/subscriber");

  const existing = await prisma.authorApiKey.findUnique({
    where: { userId: session.user.id },
    select: { keyHint: true, createdAt: true, lastUsedAt: true },
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.neuronomixer.com";

  return <ApiKeyClient existing={existing} siteUrl={siteUrl} />;
}
