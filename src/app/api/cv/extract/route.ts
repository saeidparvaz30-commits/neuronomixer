import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES_PER_FILE = 10 * 1024 * 1024; // 10 MB
const MAX_TOTAL_FILES = 30;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type ImageMediaType = (typeof IMAGE_TYPES)[number];

const TEXT_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

const SYSTEM_PROMPT = `You are a CV data extractor. You will receive content from one or more documents (PDFs, Word docs, spreadsheets, images of CVs or certificates, etc.) that together form a person's professional profile. Extract ALL relevant information across all provided content and return ONLY a valid JSON object with exactly this structure (no markdown, no explanation, no extra keys):
{
  "name": "",
  "tagline": "",
  "bio": "",
  "location": "",
  "email": "",
  "phone": "",
  "website": "",
  "linkedin": "",
  "github": "",
  "twitter": "",
  "birthYear": "",
  "education": [
    { "school": "", "degree": "", "field": "", "from": "", "to": "", "description": "" }
  ],
  "experience": [
    { "company": "", "title": "", "from": "", "to": "", "current": false, "description": "" }
  ],
  "skills": [
    { "name": "", "level": "" }
  ],
  "references": [
    { "name": "", "role": "", "company": "", "email": "" }
  ],
  "languages": [],
  "projects": [
    { "title": "", "description": "", "year": "" }
  ],
  "certifications": [
    { "title": "", "issuer": "", "year": "" }
  ],
  "honors": [
    { "title": "", "description": "" }
  ]
}
Rules:
- Merge information intelligently across all documents — do not duplicate entries.
- Use "" for missing string fields, false for missing booleans, [] for missing arrays.
- Set "current": true only if the role is clearly marked as ongoing/present.
- "tagline" should be a short professional headline (e.g. "Senior Data Scientist | Python & ML").
- "bio" should be the summary/profile paragraph if present.
- "birthYear" should be a 4-digit year string if mentioned, otherwise "".
- "languages" should be an array of language name strings (e.g. ["English", "French"]).
- "skills[].level" should be one of "expert", "intermediate", "beginner", or "" if not clear.
- Certificates or awards shown in images should be added to "certifications" or "honors".
- Extract LinkedIn/GitHub/Twitter URLs or usernames into the respective fields.
- Return ONLY the raw JSON — no markdown fences, no prose.`;

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user || (role !== "AUTHOR" && role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Cap AI-cost abuse: max 5 extractions per user per hour (S8).
  const rl = checkRateLimit(`cv-extract:${session.user.id}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many extraction attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const rawFiles = formData.getAll("files") as File[];
  if (!rawFiles.length) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }
  if (rawFiles.length > MAX_TOTAL_FILES) {
    return NextResponse.json({ error: "Maximum 30 files allowed." }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI extraction not configured." }, { status: 503 });
  }

  // ── Process each file ──────────────────────────────────────────────────────

  const textParts: string[] = [];
  const imageParts: { mediaType: ImageMediaType; data: string; label: string }[] = [];

  for (const file of rawFiles) {
    if (file.size > MAX_BYTES_PER_FILE) {
      return NextResponse.json(
        { error: `"${file.name}" exceeds the 10 MB per-file limit.` },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mime = file.type;

    if (IMAGE_TYPES.includes(mime as ImageMediaType)) {
      imageParts.push({
        mediaType: mime as ImageMediaType,
        data: buffer.toString("base64"),
        label: file.name,
      });
      continue;
    }

    if (TEXT_TYPES.includes(mime)) {
      let text = "";
      try {
        if (mime === "application/pdf") {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (buf: Buffer) => Promise<{ text: string }>;
          const parsed = await pdfParse(buffer);
          text = parsed.text;
        } else if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
          const mammoth = await import("mammoth");
          const result = await mammoth.extractRawText({ buffer });
          text = result.value;
        } else if (
          mime === "application/vnd.ms-excel" ||
          mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ) {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const XLSX = require("xlsx") as typeof import("xlsx");
          const wb = XLSX.read(buffer, { type: "buffer" });
          const lines: string[] = [];
          for (const sheetName of wb.SheetNames) {
            lines.push(`=== Sheet: ${sheetName} ===`);
            const ws = wb.Sheets[sheetName];
            lines.push(XLSX.utils.sheet_to_csv(ws));
          }
          text = lines.join("\n");
        } else {
          text = buffer.toString("utf-8");
        }
      } catch (err) {
        console.error(`[cv/extract] parse error for "${file.name}":`, err);
        return NextResponse.json(
          { error: `Failed to read "${file.name}". The file may be corrupted or password-protected.` },
          { status: 422 }
        );
      }

      text = text.trim();
      if (text) {
        // Cap per-file text at 8 000 chars; total will be trimmed below
        if (text.length > 8000) text = text.slice(0, 8000);
        textParts.push(`=== File: ${file.name} ===\n${text}`);
      }
      continue;
    }

    return NextResponse.json(
      { error: `"${file.name}" has an unsupported file type (${mime}).` },
      { status: 415 }
    );
  }

  if (!textParts.length && !imageParts.length) {
    return NextResponse.json({ error: "Could not extract any content from the uploaded files." }, { status: 422 });
  }

  // ── Build Claude message content ───────────────────────────────────────────

  type ContentBlock =
    | { type: "text"; text: string }
    | { type: "image"; source: { type: "base64"; media_type: ImageMediaType; data: string } };

  const content: ContentBlock[] = [];

  // Images first (vision context before text)
  for (const img of imageParts) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: img.mediaType, data: img.data },
    });
    content.push({ type: "text", text: `(Image file: ${img.label})` });
  }

  // Combined text from all text-based files
  if (textParts.length) {
    let combined = textParts.join("\n\n");
    if (combined.length > 20000) combined = combined.slice(0, 20000);
    content.push({ type: "text", text: combined });
  }

  // ── Call Claude ────────────────────────────────────────────────────────────

  const anthropic = new Anthropic({ apiKey });
  let cvJson: Record<string, unknown>;

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    });

    const first = message.content[0];
    if (first.type !== "text") throw new Error("Unexpected response type");

    const cleaned = first.text.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();
    cvJson = JSON.parse(cleaned);

    // Log token usage (fire-and-forget — don't block the response)
    prisma.tokenUsage.create({
      data: {
        userId: session.user.id!,
        activity: "cv-extract",
        model: "claude-haiku-4-5-20251001",
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        totalTokens: message.usage.input_tokens + message.usage.output_tokens,
      },
    }).catch((err) => console.error("[cv/extract] token log error:", err));
  } catch (err) {
    console.error("[cv/extract] Claude error:", err);
    return NextResponse.json(
      { error: "AI extraction failed. Please try again or fill in the fields manually." },
      { status: 500 }
    );
  }

  // Files are never persisted — they live only in the request buffer.
  return NextResponse.json({ cv: cvJson });
}
