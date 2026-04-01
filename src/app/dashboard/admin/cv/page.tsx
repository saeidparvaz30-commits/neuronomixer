import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import CVBuilderClient from "@/app/dashboard/author/cv/CVBuilderClient";

export const metadata = { title: "CV Builder — NeuroNomixer" };

export default async function AdminCVBuilderPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (!session?.user?.id || role !== "ADMIN") {
    redirect("/auth/sign-in");
  }

  const [cv, user] = await Promise.all([
    prisma.authorCV.findUnique({ where: { userId: session.user.id } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { image: true } }),
  ]);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <CVBuilderClient initialCV={cv as any} userImage={user?.image ?? null} />
    </div>
  );
}
