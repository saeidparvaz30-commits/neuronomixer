import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import CVPublicView from "./CVPublicView";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cv = await prisma.authorCV.findUnique({ where: { slug } });
  if (!cv || !cv.isPublic) return { title: "CV Not Found" };
  return {
    title: `${cv.name ?? "CV"} — NeuroNomixer`,
    description: cv.tagline ?? `Professional CV of ${cv.name}`,
    openGraph: {
      title: `${cv.name ?? "CV"} — NeuroNomixer`,
      description: cv.tagline ?? undefined,
      type: "profile",
    },
  };
}

export default async function CVPublicPage({ params }: Props) {
  const { slug } = await params;
  const cv = await prisma.authorCV.findUnique({ where: { slug } });

  if (!cv || !cv.isPublic) notFound();

  return <CVPublicView cv={cv as any} />;
}
