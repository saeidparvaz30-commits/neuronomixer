import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if ((session?.user as { role?: string } | undefined)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }

  const { slug } = await params;

  const category = await prisma.guideCategory.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  // Publish category, all its units, and all implemented guides in one transaction
  const [updatedCategory, updatedUnits, updatedGuides] = await prisma.$transaction([
    prisma.guideCategory.update({
      where: { id: category.id },
      data: { visibility: "PUBLISHED" },
      select: { id: true, slug: true, name: true, visibility: true },
    }),
    prisma.guideUnit.updateMany({
      where: { categoryId: category.id },
      data: { visibility: "PUBLISHED" },
    }),
    prisma.visualGuide.updateMany({
      where: { categoryId: category.id, implemented: true },
      data: { visibility: "PUBLISHED" },
    }),
  ]);

  return NextResponse.json({
    category: updatedCategory,
    unitsPublished: updatedUnits.count,
    guidesPublished: updatedGuides.count,
  });
}
