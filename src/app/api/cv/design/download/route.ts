import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user?.id || (role !== "AUTHOR" && role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let html: string;
  try {
    const body = await req.json();
    html = body.html;
    if (!html || typeof html !== "string") throw new Error("Missing html");
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Try Puppeteer/Chromium first (works on local and some Vercel configs)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const chromium = require("@sparticuz/chromium") as {
      args: string[];
      executablePath: () => Promise<string>;
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const puppeteer = require("puppeteer-core") as typeof import("puppeteer-core");

    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();

    // SSRF guard: the CV HTML is client-supplied, so block every network fetch
    // except inline data and the image CDNs we already trust (matches
    // next.config images.remotePatterns). This prevents fetches to internal /
    // cloud-metadata hosts while still allowing legitimate CV photos.
    const ALLOWED_HOSTS = new Set(["cdn.sanity.io", "lh3.googleusercontent.com"]);
    await page.setRequestInterception(true);
    page.on("request", (r) => {
      const u = r.url();
      if (u.startsWith("data:") || u.startsWith("blob:") || u === "about:blank") {
        return r.continue();
      }
      try {
        const parsed = new URL(u);
        if (parsed.protocol === "https:" && ALLOWED_HOSTS.has(parsed.hostname)) {
          return r.continue();
        }
      } catch {
        /* fall through to abort */
      }
      return r.abort();
    });

    await page.setContent(html, { waitUntil: "load" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
    await browser.close();

    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="cv.pdf"',
      },
    });
  } catch (err) {
    console.warn("[cv/design/download] Puppeteer unavailable, returning HTML for client-side print:", err);
  }

  // Fallback: return the HTML with a print-trigger wrapper so the client can use window.print()
  // The caller detects the content-type and handles accordingly.
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-PDF-Fallback": "1",
    },
  });
}
