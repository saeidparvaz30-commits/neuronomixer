import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { getActiveShare, slugifyFilename, NOINDEX_HEADERS } from "@/lib/sharedPdfs";

export const maxDuration = 60;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(`share-download:${ip}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: NOINDEX_HEADERS });
  }

  const { token } = await params;
  const share = await getActiveShare(token);
  if (!share) return new NextResponse(null, { status: 404, headers: NOINDEX_HEADERS });

  const upstream = await fetch(share.blobUrl);
  if (!upstream.ok || !upstream.body) {
    return new NextResponse(null, { status: 502, headers: NOINDEX_HEADERS });
  }

  // Tracking must never block or break the download.
  void prisma.sharedPdfEvent
    .create({ data: { sharedPdfId: share.id, type: "DOWNLOAD" } })
    .catch((e) => console.error("sharedPdf event", e));

  return new NextResponse(upstream.body, {
    headers: {
      ...NOINDEX_HEADERS,
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slugifyFilename(share.title)}.pdf"`,
    },
  });
}
