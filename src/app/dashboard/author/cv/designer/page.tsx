import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import CVDesignerClient from "./CVDesignerClient";

export const metadata = { title: "CV Designer — NeuroNomixer" };

export default async function CVDesignerPage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user?.id || (role !== "AUTHOR" && role !== "ADMIN")) {
    redirect("/auth/sign-in");
  }

  const cv = await prisma.authorCV.findUnique({ where: { userId: session.user.id } });
  if (!cv) redirect("/dashboard/author/cv");

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <CVDesignerClient
        generationsUsed={cv.designGenerationsUsed ?? 0}
        avatarUrl={cv.avatarUrl ?? null}
      />
    </div>
  );
}
