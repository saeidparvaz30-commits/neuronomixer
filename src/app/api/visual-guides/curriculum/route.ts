import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CurriculumResponse } from "@/types/visual-guides";

// Force dynamic so admin publishes reflect immediately without ISR delay
export const dynamic = "force-dynamic";

export async function GET() {
  const categories = await prisma.guideCategory.findMany({
    where: { visibility: "PUBLISHED" },
    orderBy: { order: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      color: true,
      order: true,
      units: {
        where: { visibility: "PUBLISHED" },
        orderBy: { order: "asc" },
        select: {
          id: true,
          slug: true,
          name: true,
          order: true,
          guides: {
            where: { visibility: "PUBLISHED" },
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
            },
          },
        },
      },
      guides: {
        where: { visibility: "PUBLISHED", unitId: null },
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
        },
      },
    },
  });

  return NextResponse.json({ categories } satisfies CurriculumResponse);
}
