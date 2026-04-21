import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import CVDesignerClient from "@/app/dashboard/author/cv/designer/CVDesignerClient";

export const metadata = { title: "CV Designer — NeuroNomixer" };

export default async function AdminCVDesignerPage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user?.id || role !== "ADMIN") {
    redirect("/auth/sign-in");
  }

  const cv = await prisma.authorCV.findUnique({ where: { userId: session.user.id } });
  if (!cv) redirect("/dashboard/admin/cv");

  const history = Array.isArray(cv.designHistory) ? cv.designHistory : [];
  const lastEntry = history.length > 0 ? (history[history.length - 1] as { designs: { html: string; styleName: string; description?: string }[] }) : null;
  const savedDesigns = lastEntry?.designs ?? null;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <CVDesignerClient
        generationsUsed={cv.designGenerationsUsed ?? 0}
        avatarUrl={cv.avatarUrl ?? null}
        savedDesigns={savedDesigns}
      />
    </div>
  );
}
