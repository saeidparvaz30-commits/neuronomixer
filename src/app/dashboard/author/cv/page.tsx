import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import CVBuilderClient from "./CVBuilderClient";

export const metadata = { title: "CV Builder — NeuroNomixer" };

export default async function CVBuilderPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (!session?.user?.id || (role !== "AUTHOR" && role !== "ADMIN")) {
    redirect("/auth/sign-in");
  }

  const cv = await prisma.authorCV.findUnique({
    where: { userId: session.user.id },
  });

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <CVBuilderClient initialCV={cv as any} />
    </div>
  );
}
