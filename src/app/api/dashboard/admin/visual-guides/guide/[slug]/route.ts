import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { GuideVisibility } from "@/types/visual-guides";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if ((session?.user as { role?: string } | undefined)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }

  const { slug } = await params;

  let body: { visibility?: GuideVisibility };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { visibility } = body;
  if (!visibility || !["DRAFT", "PUBLISHED", "HIDDEN"].includes(visibility)) {
    return NextResponse.json({ error: "visibility must be DRAFT, PUBLISHED, or HIDDEN" }, { status: 400 });
  }

  const guide = await prisma.visualGuide.findUnique({
    where: { slug },
    select: { implemented: true },
  });

  if (!guide) {
    return NextResponse.json({ error: "Guide not found" }, { status: 404 });
  }

  if (visibility === "PUBLISHED" && !guide.implemented) {
    return NextResponse.json(
      { error: "Cannot publish a guide that has not been implemented yet" },
      { status: 400 }
    );
  }

  const updated = await prisma.visualGuide.update({
    where: { slug },
    data: { visibility },
    select: { id: true, slug: true, title: true, visibility: true, implemented: true },
  });

  return NextResponse.json({ guide: updated });
}
