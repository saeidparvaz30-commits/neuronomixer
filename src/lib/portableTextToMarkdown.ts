type MarkDef = { _key: string; _type: string; href?: string };
type PTSpan = { _type: "span"; text: string; marks?: string[] };
type PTTextBlock = {
  _type: "block";
  style?: string;
  listItem?: string;
  markDefs?: MarkDef[];
  children?: PTSpan[];
};
type PTImage = {
  _type: "image";
  alt?: string;
  asset?: { url?: string };
};
type PTVideo = {
  _type: "video";
  url?: string;
  caption?: string;
};
type PTBlock = PTTextBlock | PTImage | PTVideo | { _type: string };

function renderSpans(children: PTSpan[], markDefs: MarkDef[]): string {
  return (children ?? []).map((span) => {
    if (span._type !== "span") return "";
    let text = span.text ?? "";
    const marks = span.marks ?? [];

    // Find link mark def first
    const linkDef = marks
      .map((m) => markDefs.find((d) => d._key === m))
      .find((d) => d?._type === "link");

    if (linkDef?.href) text = `[${text}](${linkDef.href})`;
    if (marks.includes("strong")) text = `**${text}**`;
    if (marks.includes("em")) text = `*${text}*`;
    if (marks.includes("code")) text = `\`${text}\``;

    return text;
  }).join("");
}

export function portableTextToMarkdown(blocks: PTBlock[]): string {
  if (!Array.isArray(blocks)) return "";

  const lines: string[] = [];

  for (const block of blocks) {
    if (block._type === "block") {
      const b = block as PTTextBlock;
      const markDefs = b.markDefs ?? [];
      const text = renderSpans(b.children ?? [], markDefs);
      const style = b.style ?? "normal";

      if (b.listItem === "bullet") {
        lines.push(`- ${text}`);
      } else if (b.listItem === "number") {
        lines.push(`1. ${text}`);
      } else if (style === "h1") {
        lines.push(`# ${text}`);
      } else if (style === "h2") {
        lines.push(`## ${text}`);
      } else if (style === "h3") {
        lines.push(`### ${text}`);
      } else if (style === "h4") {
        lines.push(`#### ${text}`);
      } else if (style === "blockquote") {
        lines.push(`> ${text}`);
      } else {
        lines.push(text);
      }
    } else if (block._type === "image") {
      const img = block as PTImage;
      const url = img.asset?.url ?? "";
      const alt = img.alt ?? "image";
      lines.push(url ? `![${alt}](${url})` : `[Image: ${alt}]`);
    } else if (block._type === "video") {
      const vid = block as PTVideo;
      const caption = vid.caption ? `VIDEO: ${vid.caption}` : "VIDEO";
      lines.push(vid.url ? `[${caption}](${vid.url})` : `[${caption}]`);
    }
    // skip table and unknown block types
  }

  return lines.join("\n\n");
}
