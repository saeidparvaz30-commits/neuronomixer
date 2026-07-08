import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if ((session?.user as { role?: string } | undefined)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }

  // Get all completion counts grouped by guideSlug
  const completionGroups = await prisma.guideCompletion.groupBy({
    by: ["guideSlug"],
    _count: { guideSlug: true },
  });
  const completionMap = Object.fromEntries(
    completionGroups.map((g) => [g.guideSlug, g._count.guideSlug])
  );

  const categories = await prisma.guideCategory.findMany({
    orderBy: { order: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      color: true,
      order: true,
      visibility: true,
      units: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          slug: true,
          name: true,
          order: true,
          visibility: true,
          guides: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              slug: true,
              title: true,
              description: true,
              interactiveType: true,
              audience: true,
              order: true,
              implemented: true,
              nextGuideSlug: true,
              visibility: true,
            },
          },
        },
      },
      guides: {
        where: { unitId: null },
        orderBy: { order: "asc" },
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          interactiveType: true,
          audience: true,
          order: true,
          implemented: true,
          nextGuideSlug: true,
          visibility: true,
        },
      },
    },
  });

  // Attach completion counts to each guide
  const enrichedCategories = categories.map((cat) => ({
    ...cat,
    units: cat.units.map((unit) => ({
      ...unit,
      guides: unit.guides.map((guide) => ({
        ...guide,
        completionCount: completionMap[guide.slug] ?? 0,
      })),
    })),
    guides: cat.guides.map((guide) => ({
      ...guide,
      completionCount: completionMap[guide.slug] ?? 0,
    })),
  }));

  return NextResponse.json({ categories: enrichedCategories });
}
