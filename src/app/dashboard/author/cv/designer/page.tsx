import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import CVDesignerClient from "./CVDesignerClient";

export const metadata = { title: "CV Designer" };

export default async function CVDesignerPage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user?.id || (role !== "AUTHOR" && role !== "ADMIN")) {
    redirect("/auth/sign-in");
  }

  const cv = await prisma.authorCV.findUnique({ where: { userId: session.user.id } });
  if (!cv) redirect("/dashboard/author/cv");

  // Load the most recent saved designs so the user doesn't have to regenerate
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
