import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateShareToken } from "@/lib/sharedPdfs";

async function requireAdmin() {
  const session = await auth();
  return (session?.user as { role?: string } | undefined)?.role === "ADMIN";
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }

  let body: { title?: string; url?: string; pathname?: string; size?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { title, url, pathname, size } = body;
  if (!title?.trim() || !url || !pathname || typeof size !== "number" || size <= 0) {
    return NextResponse.json(
      { error: "title, url, pathname, and size are required" },
      { status: 400 }
    );
  }
  if (!pathname.startsWith("shared-pdfs/")) {
    return NextResponse.json({ error: "Unexpected blob pathname" }, { status: 400 });
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: "Unexpected blob URL" }, { status: 400 });
  }
  if (
    parsedUrl.protocol !== "https:" ||
    !parsedUrl.hostname.endsWith(".public.blob.vercel-storage.com")
  ) {
    return NextResponse.json({ error: "Unexpected blob URL" }, { status: 400 });
  }
  if (title.trim().length > 300) {
    return NextResponse.json(
      { error: "Title must be 300 characters or fewer" },
      { status: 400 }
    );
  }

  const share = await prisma.sharedPdf.create({
    data: {
      token: generateShareToken(),
      title: title.trim(),
      blobUrl: url,
      blobPathname: pathname,
      sizeBytes: size,
    },
  });

  return NextResponse.json({
    id: share.id,
    token: share.token,
    shareUrl: `https://www.neuronomixer.com/share/${share.token}`,
  });
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }

  const [shares, counts] = await Promise.all([
    prisma.sharedPdf.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.sharedPdfEvent.groupBy({
      by: ["sharedPdfId", "type"],
      _count: { _all: true },
    }),
  ]);

  const countFor = (id: string, type: "VIEW" | "DOWNLOAD") =>
    counts.find((c) => c.sharedPdfId === id && c.type === type)?._count._all ?? 0;

  return NextResponse.json({
    shares: shares.map((s) => ({
      id: s.id,
      token: s.token,
      title: s.title,
      sizeBytes: s.sizeBytes,
      active: s.active,
      createdAt: s.createdAt,
      views: countFor(s.id, "VIEW"),
      downloads: countFor(s.id, "DOWNLOAD"),
    })),
  });
}
