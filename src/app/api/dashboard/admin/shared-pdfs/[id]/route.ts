import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  return (session?.user as { role?: string } | undefined)?.role === "ADMIN";
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }

  const { id } = await params;
  let body: { active?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (typeof body.active !== "boolean") {
    return NextResponse.json({ error: "active must be a boolean" }, { status: 400 });
  }

  try {
    const share = await prisma.sharedPdf.update({
      where: { id },
      data: { active: body.active },
    });
    return NextResponse.json({ id: share.id, active: share.active });
  } catch {
    return NextResponse.json({ error: "Share not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }

  const { id } = await params;
  const share = await prisma.sharedPdf.findUnique({ where: { id } });
  if (!share) return NextResponse.json({ error: "Share not found" }, { status: 404 });

  // Blob first: if it fails we keep the row so the file stays managed.
  try {
    await del(share.blobPathname);
  } catch {
    return NextResponse.json(
      { error: "Blob deletion failed; share kept" },
      { status: 502 }
    );
  }
  await prisma.sharedPdf.delete({ where: { id } }); // events cascade

  return NextResponse.json({ deleted: true });
}
