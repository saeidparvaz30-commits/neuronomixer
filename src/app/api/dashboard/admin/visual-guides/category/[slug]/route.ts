import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { GuideVisibility } from "@/types/visual-guides";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if ((session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  try {
    const category = await prisma.guideCategory.update({
      where: { slug },
      data: { visibility },
      select: { id: true, slug: true, name: true, visibility: true },
    });
    return NextResponse.json({ category });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    throw e;
  }
}
