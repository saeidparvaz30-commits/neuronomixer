/**
 * Converts Sanity Portable Text blocks back to Tiptap editor JSON format.
 * Handles: paragraphs, headings, blockquotes, bullet/ordered lists,
 * inline marks (bold, italic, links), images (with Sanity asset refs), YouTube videos.
 */

interface PTSpan {
  _type: "span";
  text: string;
  marks?: string[];
}

interface PTMarkDef {
  _key: string;
  _type: string;
  href?: string;
}

interface PTBlock {
  _type: "block";
  style?: string;
  markDefs?: PTMarkDef[];
  children?: PTSpan[];
  listItem?: "bullet" | "number";
  level?: number;
}

interface PTImage {
  _type: "image";
  asset?: { _id: string; url: string } | null;
  alt?: string;
  alignment?: string;
  width?: number;
}

interface PTVideo {
  _type: "video";
  source?: string;
  url?: string;
}

type PTNode = PTBlock | PTImage | PTVideo | Record<string, unknown>;

type TiptapNode = Record<string, unknown>;

function convertSpans(children: PTSpan[], markDefs: PTMarkDef[]): TiptapNode[] {
  return children
    .filter((s) => s._type === "span" && s.text !== "")
    .map((span) => {
      const marks: TiptapNode[] = (span.marks ?? [])
        .map((markKey): TiptapNode | null => {
          if (markKey === "strong") return { type: "bold" };
          if (markKey === "em") return { type: "italic" };
          const def = markDefs.find((d) => d._key === markKey);
          if (def?._type === "link" && def.href) {
            return { type: "link", attrs: { href: def.href } };
          }
          return null;
        })
        .filter((m): m is TiptapNode => m !== null);

      return {
        type: "text",
        text: span.text,
        ...(marks.length > 0 ? { marks } : {}),
      };
    });
}

export function portableTextToTiptap(
  blocks: PTNode[]
): { type: "doc"; content: TiptapNode[] } {
  const content: TiptapNode[] = [];
  let i = 0;

  while (i < blocks.length) {
    const node = blocks[i];

    // ── Image ────────────────────────────────────────────────────────────
    if (node._type === "image") {
      const img = node as PTImage;
      const assetId = img.asset?._id ?? null;
      const url = img.asset?.url ?? null;
      if (url && assetId) {
        content.push({
          type: "image",
          attrs: {
            src: url,
            alt: img.alt ?? "",
            assetId,
            alignment: img.alignment ?? "full",
            width: img.width ?? null,
          },
        });
      }
      i++;
      continue;
    }

    // ── Video (YouTube / Vimeo) ───────────────────────────────────────────
    if (node._type === "video") {
      const vid = node as PTVideo;
      if (vid.source === "external" && vid.url) {
        content.push({
          type: "youtube",
          attrs: { src: vid.url },
        });
      }
      i++;
      continue;
    }

    // ── Text block ────────────────────────────────────────────────────────
    if (node._type === "block") {
      const block = node as PTBlock;

      // Grouped list items
      if (block.listItem) {
        const listItem = block.listItem;
        const tiptapListType =
          listItem === "bullet" ? "bulletList" : "orderedList";
        const items: TiptapNode[] = [];

        while (i < blocks.length) {
          const curr = blocks[i] as PTBlock;
          if (curr._type !== "block" || curr.listItem !== listItem) break;
          const spans = convertSpans(curr.children ?? [], curr.markDefs ?? []);
          items.push({
            type: "listItem",
            content: [{ type: "paragraph", content: spans }],
          });
          i++;
        }

        content.push({ type: tiptapListType, content: items });
        continue;
      }

      const style = block.style ?? "normal";
      const spans = convertSpans(block.children ?? [], block.markDefs ?? []);

      if (style === "blockquote") {
        content.push({
          type: "blockquote",
          content: [{ type: "paragraph", content: spans }],
        });
      } else {
        const headingMatch = style.match(/^h([1-6])$/);
        if (headingMatch) {
          content.push({
            type: "heading",
            attrs: { level: parseInt(headingMatch[1]) },
            content: spans,
          });
        } else {
          content.push({ type: "paragraph", content: spans });
        }
      }

      i++;
      continue;
    }

    i++;
  }

  return { type: "doc", content };
}
