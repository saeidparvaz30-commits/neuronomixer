import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 30;

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const SYSTEM_PROMPT = `You are a CV data extractor. Given raw text from a CV or resume document, extract all relevant information and return ONLY a valid JSON object with exactly this structure (no markdown, no explanation, no extra keys):
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
- Use "" for missing string fields, false for missing booleans, [] for missing arrays.
- Set "current": true only if the role is clearly marked as ongoing/present.
- "tagline" should be a short professional headline (e.g. "Senior Software Engineer | React & Node.js").
- "bio" should be the summary/profile paragraph if present.
- "birthYear" should be a 4-digit year string if the birth year is mentioned, otherwise "".
- "languages" should be an array of language name strings (e.g. ["English", "French"]).
- "skills[].level" should be one of "expert", "intermediate", "beginner", or "" if not clear.
- Extract LinkedIn/GitHub/Twitter URLs or usernames into the respective fields.
- Return ONLY the raw JSON — no markdown fences, no prose.`;

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || (role !== "AUTHOR" && role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Please upload a PDF, DOCX, or TXT file." },
      { status: 415 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large. Maximum size is 5 MB." }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let rawText = "";

  try {
    if (file.type === "application/pdf") {
      // Use lib path directly to avoid pdf-parse v1's test-fixture loader crashing in Next.js
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (buf: Buffer) => Promise<{ text: string }>;
      const parsed = await pdfParse(buffer);
      rawText = parsed.text;
    } else if (
      file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
    } else {
      rawText = buffer.toString("utf-8");
    }
  } catch (err) {
    console.error("[cv/extract] parse error:", err);
    return NextResponse.json({ error: "Failed to read file content." }, { status: 422 });
  }

  rawText = rawText.trim();
  if (!rawText) {
    return NextResponse.json({ error: "Could not extract any text from the file." }, { status: 422 });
  }

  // Truncate to ~12 000 chars to stay well within token limits
  if (rawText.length > 12000) rawText = rawText.slice(0, 12000);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI extraction not configured." }, { status: 503 });
  }

  const anthropic = new Anthropic({ apiKey });

  let cvJson: Record<string, unknown>;
  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: rawText }],
    });

    const content = message.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    // Strip possible markdown fences
    const cleaned = content.text.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();
    cvJson = JSON.parse(cleaned);
  } catch (err) {
    console.error("[cv/extract] Claude error:", err);
    return NextResponse.json(
      { error: "AI extraction failed. Please try again or fill in the fields manually." },
      { status: 500 }
    );
  }

  return NextResponse.json({ cv: cvJson });
}
