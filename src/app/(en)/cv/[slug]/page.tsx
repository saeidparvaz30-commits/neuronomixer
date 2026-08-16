import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import CVPublicView, { type CV } from "./CVPublicView";
import type { Metadata } from "next";

export async function generateStaticParams() {
  const cvs = await prisma.authorCV.findMany({
    where: { isPublic: true, slug: { not: null } },
    select: { slug: true },
  });
  return cvs.map((cv) => ({ slug: cv.slug as string }));
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cv = await prisma.authorCV.findUnique({ where: { slug } });
  if (!cv || !cv.isPublic) return { title: "CV Not Found" };
  return {
    title: `${cv.name ?? "CV"} | NeuroNomixer`,
    description: cv.tagline ?? `Professional CV of ${cv.name}`,
    openGraph: {
      title: `${cv.name ?? "CV"} | NeuroNomixer`,
      description: cv.tagline ?? undefined,
      type: "profile",
    },
  };
}

export default async function CVPublicPage({ params }: Props) {
  const { slug } = await params;
  const cv = await prisma.authorCV.findUnique({ where: { slug } });

  if (!cv || !cv.isPublic) notFound();

  return <CVPublicView cv={cv as unknown as CV} />;
}
