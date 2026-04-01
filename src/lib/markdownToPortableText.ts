import { nanoid } from "nanoid";
import { client } from "@/sanity/lib/client";

// ─── Portable Text types ──────────────────────────────────────────────────────

type MarkDef = { _key: string; _type: "link"; href: string };
type PTSpan = { _key: string; _type: "span"; text: string; marks: string[] };
type PTTextBlock = {
  _key: string; _type: "block"; style: string;
  markDefs: MarkDef[]; listItem?: string; level?: number;
  children: PTSpan[];
};
type PTImage = {
  _key: string; _type: "image";
  asset: { _type: "reference"; _ref: string };
  alt: string; alignment: string;
};
type PTVideo = {
  _key: string; _type: "video"; source: "external";
  url: string; caption: string;
};
type PTBlock = PTTextBlock | PTImage | PTVideo;

// ─── Image uploader ───────────────────────────────────────────────────────────

async function uploadImageUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.split("/")[1]?.split(";")[0] ?? "jpg";
    const asset = await client.assets.upload("image", buffer, {
      filename: `api-upload-${Date.now()}.${ext}`,
      contentType,
    });
    return asset._id;
  } catch {
    return null;
  }
}

// ─── Inline mark parser (bold, italic, inline-code, links) ───────────────────

function parseInline(raw: string, markDefs: MarkDef[]): PTSpan[] {
  const spans: PTSpan[] = [];
  // Order matters: links before bold/italic so [**bold**](url) works
  const re = /(\[([^\]]+)\]\((https?:\/\/[^\)]+)\)|\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+?)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) {
      spans.push({ _key: nanoid(8), _type: "span", text: raw.slice(last, m.index), marks: [] });
    }
    if (m[2] && m[3]) {
      // Link: [text](url)
      const linkKey = nanoid(8);
      markDefs.push({ _key: linkKey, _type: "link", href: m[3] });
      spans.push({ _key: nanoid(8), _type: "span", text: m[2], marks: [linkKey] });
    } else if (m[4]) {
      spans.push({ _key: nanoid(8), _type: "span", text: m[4], marks: ["strong"] });
    } else if (m[5]) {
      spans.push({ _key: nanoid(8), _type: "span", text: m[5], marks: ["em"] });
    } else if (m[6]) {
      spans.push({ _key: nanoid(8), _type: "span", text: m[6], marks: ["code"] });
    }
    last = m.index + m[0].length;
  }
  if (last < raw.length) {
    spans.push({ _key: nanoid(8), _type: "span", text: raw.slice(last), marks: [] });
  }
  return spans.length ? spans : [{ _key: nanoid(8), _type: "span", text: raw, marks: [] }];
}

function textBlock(style: string, raw: string, listItem?: string): PTTextBlock {
  const markDefs: MarkDef[] = [];
  const children = parseInline(raw, markDefs);
  return {
    _key: nanoid(8), _type: "block", style, markDefs,
    ...(listItem ? { listItem, level: 1 } : {}),
    children,
  };
}

// ─── Main converter ───────────────────────────────────────────────────────────

/** Detect YouTube / Vimeo URL */
function isVideoUrl(url: string) {
  return /youtube\.com|youtu\.be|vimeo\.com/.test(url);
}

export async function markdownToPortableText(markdown: string): Promise<PTBlock[]> {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: PTBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // ── Headings ──
    if (/^#### /.test(line)) {
      blocks.push(textBlock("h4", line.slice(5))); i++; continue;
    }
    if (/^### /.test(line)) {
      blocks.push(textBlock("h3", line.slice(4))); i++; continue;
    }
    if (/^## /.test(line)) {
      blocks.push(textBlock("h2", line.slice(3))); i++; continue;
    }
    if (/^# /.test(line)) {
      blocks.push(textBlock("h1", line.slice(2))); i++; continue;
    }

    // ── Blockquote ──
    if (/^> /.test(line)) {
      blocks.push(textBlock("blockquote", line.slice(2))); i++; continue;
    }

    // ── Bullet list ──
    if (/^[-*] /.test(line)) {
      blocks.push(textBlock("normal", line.slice(2), "bullet")); i++; continue;
    }

    // ── Numbered list ──
    if (/^\d+\. /.test(line)) {
      blocks.push(textBlock("normal", line.replace(/^\d+\. /, ""), "number")); i++; continue;
    }

    // ── Standalone image: ![alt](url) ──
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\((https?:\/\/[^\)]+)\)$/);
    if (imgMatch) {
      const [, alt, url] = imgMatch;
      const ref = await uploadImageUrl(url);
      if (ref) {
        blocks.push({
          _key: nanoid(8), _type: "image",
          asset: { _type: "reference", _ref: ref },
          alt: alt || "", alignment: "full",
        });
      } else {
        // Fallback: text note if upload fails
        blocks.push(textBlock("normal", `[Image: ${alt || url}]`));
      }
      i++; continue;
    }

    // ── Video block: [VIDEO: caption](url) ──
    const videoMatch = trimmed.match(/^\[VIDEO(?::\s*([^\]]*))?\]\((https?:\/\/[^\)]+)\)$/i);
    if (videoMatch) {
      blocks.push({
        _key: nanoid(8), _type: "video", source: "external",
        url: videoMatch[2], caption: videoMatch[1]?.trim() ?? "",
      });
      i++; continue;
    }

    // ── Bare YouTube/Vimeo URL on its own line → video block ──
    if (/^https?:\/\//.test(trimmed) && isVideoUrl(trimmed) && !trimmed.includes(" ")) {
      blocks.push({
        _key: nanoid(8), _type: "video", source: "external",
        url: trimmed, caption: "",
      });
      i++; continue;
    }

    // ── Empty / divider ──
    if (trimmed === "" || /^---+$/.test(trimmed)) { i++; continue; }

    // ── Paragraph (join consecutive non-special lines) ──
    const paraLines: string[] = [line];
    while (i + 1 < lines.length) {
      const next = lines[i + 1].trim();
      if (
        next === "" ||
        /^#{1,4} /.test(next) ||
        /^[-*] /.test(next) ||
        /^\d+\. /.test(next) ||
        /^> /.test(next) ||
        /^!\[/.test(next) ||
        /^\[VIDEO/i.test(next) ||
        (/^https?:\/\//.test(next) && isVideoUrl(next))
      ) break;
      paraLines.push(lines[i + 1]);
      i++;
    }
    blocks.push(textBlock("normal", paraLines.join(" ")));
    i++;
  }

  return blocks;
}

/** Upload a URL and return a Sanity image block, or null on failure */
export async function uploadMainImage(
  url: string
): Promise<{ _type: "image"; asset: { _type: "reference"; _ref: string }; alt: string } | null> {
  const ref = await uploadImageUrl(url);
  if (!ref) return null;
  return { _type: "image", asset: { _type: "reference", _ref: ref }, alt: "" };
}
