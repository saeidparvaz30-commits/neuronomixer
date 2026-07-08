import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 120;

// Each call generates ONE design. No JSON wrapping — just a tiny text header then raw HTML.
// This avoids the token truncation that happens when 3 HTML docs are crammed into one JSON response.
const SYSTEM_PROMPT = `You are an expert CV/resume designer. You create stunning, professional, print-ready CV designs as self-contained HTML documents with embedded CSS.

CRITICAL RULES:
1. Output MUST start with exactly two header lines, then the full HTML document. No other text before or after.
2. Each design MUST be a complete, self-contained HTML document with ALL CSS embedded in a <style> tag. No external stylesheets, no CDN links.
3. ZERO JavaScript. ZERO animations. ZERO transitions. ZERO hover effects. ZERO CSS animations or @keyframes. The HTML must be 100% static.
4. Use only web-safe fonts OR Google Fonts imported via @import in the <style> tag (limit to 1-2 fonts).
5. ONE PAGE ONLY — this is the most critical constraint. The ENTIRE CV must fit within exactly 210mm × 297mm (A4). Use these CSS rules verbatim:
   @page { size: A4 portrait; margin: 0; }
   html { width: 210mm; height: 297mm; overflow: hidden; }
   body { width: 210mm; height: 297mm; overflow: hidden; box-sizing: border-box; }
   Never use min-height on html or body — use height: 297mm as a hard ceiling.
6. BACKGROUND COLOR PRINTING — always include this rule so colors appear in PDF print:
   * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
6. To fit all content in one page: use font-size 9pt–10pt for body text, 10pt–12pt for section headers, 1.3–1.4 line-height, and compact section padding (4mm–8mm). Use a two-column layout when the CV has many sections.
7. All colors must be defined as CSS custom properties at :root level. Always define --primary-color and --font-family.
8. Respect sectionVisibility — do NOT include sections the user has hidden. Skip entries where hidden === true.
9. Make the design rich, professional, and visually polished within the single-page constraint.
10. Do not include placeholder text — only use the actual CV data provided.
11. Do NOT add the two-line header (STYLE:/DESCRIPTION:) inside the HTML itself — only output it before <!DOCTYPE html>.
12. PROFILE PHOTO: If a base64 data URI is provided, embed it verbatim as the src of an <img> tag. Do not reference any external URL. Place it in the header or sidebar. Size it at 22mm × 22mm with border-radius for a circular or rounded crop. If no photo is provided, do not add a placeholder or empty image slot.

EXACT OUTPUT FORMAT (no deviations):
STYLE: <2-3 word style name>
DESCRIPTION: <one sentence describing the design approach>
<!DOCTYPE html>
<html>
...rest of complete HTML...
</html>`;

const STYLE_DIRECTIVES = [
  "Conservative & Corporate: Classic two-column or single-column layout, serif or professional sans-serif font, muted professional color palette (navy, dark grey, or black), formal section headers, emphasis on work history and credentials. Suitable for law, finance, executive roles.",
  "Modern & Clean: Bold typographic hierarchy, generous whitespace, one strong accent color, clean geometric section dividers, skills shown as visual bars or tags, contemporary sans-serif font. Eye-catching but professional.",
  "Creative & Distinctive: Unique structural layout (sidebar, asymmetric columns, or bold header block), expressive use of color, personality-driven typography, standout visual identity. Appropriate for design, tech, creative industries.",
];

type StylePreferences = {
  industry: string;
  careerLevel: string;
  visualStyle: string;
  colorPreference: string;
  emphasis: string[];
  cvLength: string;
  additionalNotes?: string;
};

type RequestBody =
  | { mode: "job-description"; jobDescription: string; includePhoto?: boolean }
  | { mode: "style-preferences"; preferences: StylePreferences; includePhoto?: boolean };

function filterCVData(cv: Record<string, unknown>, sectionVisibility: Record<string, boolean>) {
  const isVisible = (key: string) => sectionVisibility[key] !== false;

  function filterHidden<T extends { hidden?: boolean }>(arr: T[]): T[] {
    return arr.filter((e) => !e.hidden).map(({ hidden: _h, ...rest }) => rest as T);
  }

  return {
    name: cv.name,
    tagline: cv.tagline,
    bio: isVisible("bio") ? cv.bio : undefined,
    location: cv.location,
    email: cv.email,
    phone: cv.phone,
    website: cv.website,
    linkedin: cv.linkedin,
    github: cv.github,
    twitter: cv.twitter,
    birthYear: cv.birthYear,
    education: isVisible("education") ? filterHidden((cv.education as { hidden?: boolean }[]) ?? []) : [],
    experience: isVisible("experience") ? filterHidden((cv.experience as { hidden?: boolean }[]) ?? []) : [],
    skills: isVisible("skills") ? filterHidden((cv.skills as { hidden?: boolean }[]) ?? []) : [],
    references: isVisible("references") ? filterHidden((cv.references as { hidden?: boolean }[]) ?? []) : [],
    languages: isVisible("languages") ? cv.languages : [],
    projects: isVisible("projects") ? filterHidden((cv.projects as { hidden?: boolean }[]) ?? []) : [],
    certifications: isVisible("certifications") ? filterHidden((cv.certifications as { hidden?: boolean }[]) ?? []) : [],
    honors: isVisible("honors") ? filterHidden((cv.honors as { hidden?: boolean }[]) ?? []) : [],
  };
}

// Injected into every generated design.
// Guarantees single-page output AND forces Chrome to print background colors.
const SINGLE_PAGE_CSS = `
<style id="single-page-enforcer">
  @page { size: A4 portrait; margin: 0; }
  html {
    width: 210mm !important;
    height: 297mm !important;
    max-height: 297mm !important;
    overflow: hidden !important;
    zoom: 0.97;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    width: 210mm !important;
    height: 297mm !important;
    max-height: 297mm !important;
    overflow: hidden !important;
    box-sizing: border-box !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  @media print {
    html, body, * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
</style>`;

function parseDesignResponse(text: string): { styleName: string; description: string; html: string } {
  const lines = text.trim().split("\n");
  const styleLine = lines.find((l) => l.startsWith("STYLE:"));
  const descLine = lines.find((l) => l.startsWith("DESCRIPTION:"));
  const htmlStart = text.indexOf("<!DOCTYPE html>");

  const styleName = styleLine ? styleLine.replace("STYLE:", "").trim() : "Design";
  const description = descLine ? descLine.replace("DESCRIPTION:", "").trim() : "";
  let html = htmlStart !== -1 ? text.slice(htmlStart) : text;

  // Inject single-page enforcer just before </head> (or before <body> as fallback)
  const headClose = html.indexOf("</head>");
  if (headClose !== -1) {
    html = html.slice(0, headClose) + SINGLE_PAGE_CSS + "\n" + html.slice(headClose);
  } else {
    const bodyOpen = html.indexOf("<body");
    if (bodyOpen !== -1) {
      html = html.slice(0, bodyOpen) + SINGLE_PAGE_CSS + "\n" + html.slice(bodyOpen);
    }
  }

  return { styleName, description, html };
}

type PhotoInfo = { dataUri: string; base64: string; mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" };

const PHOTO_PLACEHOLDER = "PROFILE_PHOTO_SRC_PLACEHOLDER";

async function generateOneDesign(
  anthropic: Anthropic,
  cvData: object,
  styleDirective: string,
  contextMessage: string,
  photo?: PhotoInfo
): Promise<{ styleName: string; description: string; html: string; inputTokens: number; outputTokens: number }> {
  // Photo is passed as a vision content block (not embedded base64 text) to avoid
  // consuming 10k–30k text tokens for the raw base64 string.
  // We use a placeholder src that gets replaced with the real data URI after generation.
  const photoInstruction = photo
    ? `\n\nPROFILE PHOTO: The user's profile photo is attached as an image in this message. Include it in the CV. Use the exact string "${PHOTO_PLACEHOLDER}" as the <img> src attribute — do not change it. Style: 22mm × 22mm, border-radius: 50% or 8px, placed in the header or sidebar.`
    : "";

  const userMessage = `Here is the CV data:\n${JSON.stringify(cvData, null, 2)}\n\n${contextMessage}${photoInstruction}\n\nDesign style for this specific design:\n${styleDirective}`;

  const content: Anthropic.MessageParam["content"] = photo
    ? [
        { type: "text", text: userMessage },
        { type: "image", source: { type: "base64", media_type: photo.mediaType, data: photo.base64 } },
      ]
    : userMessage;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 5000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
  });

  const first = message.content[0];
  if (first.type !== "text") throw new Error("Unexpected response type");

  const result = parseDesignResponse(first.text);

  // Replace placeholder with the actual data URI
  if (photo) {
    result.html = result.html.replaceAll(PHOTO_PLACEHOLDER, photo.dataUri);
  }

  return {
    ...result,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user?.id || (role !== "AUTHOR" && role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = session.user.id;

  const cv = await prisma.authorCV.findUnique({ where: { userId } });
  if (!cv) {
    return NextResponse.json({ error: "No CV found. Please build your CV first." }, { status: 404 });
  }

  // Atomically claim the single generation slot BEFORE any expensive Claude call.
  // updateMany with a conditional where compiles to one UPDATE ... WHERE, so
  // concurrent requests cannot all pass the gate (closes the TOCTOU race, S2).
  const claim = await prisma.authorCV.updateMany({
    where: { userId, designGenerationsUsed: { lt: 1 } },
    data: { designGenerationsUsed: { increment: 1 } },
  });
  if (claim.count === 0) {
    return NextResponse.json(
      { error: "limit_reached", message: "You've used your design generation. Please contact us for more." },
      { status: 429 }
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI design not configured." }, { status: 503 });
  }

  const sectionVisibility = (cv.sectionVisibility as Record<string, boolean>) ?? {};
  const filteredCV = filterCVData(cv as unknown as Record<string, unknown>, sectionVisibility);

  // Build the context message that's shared across all 3 calls
  let contextMessage: string;
  if (body.mode === "job-description") {
    contextMessage = `The user is targeting this specific role. Tailor the visual tone, section ordering, and emphasis to match the industry and seniority implied by the posting:\n\n"""\n${body.jobDescription}\n"""`;
  } else {
    const p = body.preferences;

    // Decode custom palette: "custom:#111,#222,#333" → human-readable instruction
    let colorInstruction: string;
    if (p.colorPreference.startsWith("custom:")) {
      const hexValues = p.colorPreference.replace("custom:", "").split(",");
      const [primary, secondary, background] = hexValues;
      colorInstruction = `Custom palette specified by the user — use these EXACT hex colors:
  Primary color: ${primary}
  Secondary / accent color: ${secondary}
  Background color: ${background}
  Build the entire design around these colors. Do not substitute or invent other colors.`;
    } else {
      colorInstruction = p.colorPreference;
    }

    contextMessage = `User's design preferences:
- Industry: ${p.industry}
- Career Level: ${p.careerLevel}
- Visual Style preference: ${p.visualStyle}
- Color Preference: ${colorInstruction}
- Sections to Emphasize: ${p.emphasis.join(", ")}
- CV Length: ${p.cvLength}
- Additional Notes: ${p.additionalNotes || "None"}`;
  }

  // Fetch profile photo — kept as separate base64 + dataUri so we can pass it
  // as a vision content block (not embedded in text) to avoid huge token counts.
  let photo: PhotoInfo | undefined;
  if (body.includePhoto && cv.avatarUrl) {
    try {
      const imgRes = await fetch(cv.avatarUrl);
      if (imgRes.ok) {
        const rawType = imgRes.headers.get("content-type") ?? "image/jpeg";
        const mediaType = (["image/jpeg", "image/png", "image/gif", "image/webp"].includes(rawType)
          ? rawType
          : "image/jpeg") as PhotoInfo["mediaType"];
        const arrayBuffer = await imgRes.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        photo = { dataUri: `data:${mediaType};base64,${base64}`, base64, mediaType };
      }
    } catch (err) {
      console.warn("[cv/design] Could not fetch avatar, proceeding without photo:", err);
    }
  }

  let designs: { styleName: string; description: string; html: string; inputTokens: number; outputTokens: number }[];

  try {
    // maxRetries: 0 — fail immediately on rate limits instead of retrying for minutes
    const anthropic = new Anthropic({ apiKey, maxRetries: 0 });

    // Sequential calls to stay within the 30k input tokens/minute rate limit
    designs = [];
    for (const directive of STYLE_DIRECTIVES) {
      designs.push(
        await generateOneDesign(anthropic, filteredCV, directive, contextMessage, photo)
      );
    }
  } catch (err) {
    console.error("[cv/design] Claude error:", err);
    // Release the slot claimed above, since generation failed (S2).
    await prisma.authorCV
      .update({ where: { userId }, data: { designGenerationsUsed: { decrement: 1 } } })
      .catch(() => {});
    const isRateLimit = err instanceof Error && err.message.includes("rate_limit");
    return NextResponse.json(
      { error: isRateLimit ? "Rate limit reached. Please wait a minute and try again." : "Design generation failed. Please try again." },
      { status: isRateLimit ? 429 : 500 }
    );
  }

  // Increment counter and store in history
  const newCount = cv.designGenerationsUsed + 1;
  const historyEntry = {
    generatedAt: new Date().toISOString(),
    mode: body.mode,
    designs: designs.map(({ html, styleName }) => ({ html, styleName })),
  };
  const currentHistory = Array.isArray(cv.designHistory) ? cv.designHistory : [];

  await prisma.authorCV.update({
    where: { userId },
    data: {
      // designGenerationsUsed already incremented by the atomic claim above (S2).
      designHistory: [...currentHistory, historyEntry],
    },
  });

  // Log token usage — one row per Claude call (3 per generation)
  await prisma.tokenUsage.createMany({
    data: designs.map((d) => ({
      userId,
      activity: "cv-design",
      model: "claude-sonnet-4-6",
      inputTokens: d.inputTokens,
      outputTokens: d.outputTokens,
      totalTokens: d.inputTokens + d.outputTokens,
    })),
  });

  return NextResponse.json({
    designs,
    generationsRemaining: 1 - newCount,
  });
}
