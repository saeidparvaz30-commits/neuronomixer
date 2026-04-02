/**
 * Converts Tiptap editor JSON output to Sanity Portable Text blocks.
 * Supports: paragraphs, headings (h1-h4), bold, italic, links, lists,
 * blockquotes, inline images (with Sanity asset ref), YouTube embeds.
 */

interface TiptapMark {
  type: string;
  attrs?: Record<string, string | null>;
}

interface TiptapNode {
  type: string;
  text?: string;
  marks?: TiptapMark[];
  content?: TiptapNode[];
  attrs?: Record<string, string | number | null>;
}

interface PortableTextSpan {
  _type: "span";
  _key: string;
  text: string;
  marks: string[];
}

interface PortableTextMarkDef {
  _type: string;
  _key: string;
  href?: string;
}

interface PortableTextBlock {
  _type: "block";
  _key: string;
  style: string;
  children: PortableTextSpan[];
  markDefs: PortableTextMarkDef[];
  listItem?: string;
  level?: number;
}

let keyCounter = 0;
function nextKey() {
  return `k${++keyCounter}`;
}

function extractSpans(
  nodes: TiptapNode[],
  markDefs: PortableTextMarkDef[]
): PortableTextSpan[] {
  return nodes.flatMap((node) => {
    if (node.type !== "text" || node.text === undefined) return [];

    const marks: string[] = [];

    for (const mark of node.marks ?? []) {
      if (mark.type === "bold") marks.push("strong");
      else if (mark.type === "italic") marks.push("em");
      else if (mark.type === "link" && mark.attrs?.href) {
        const key = nextKey();
        markDefs.push({ _type: "link", _key: key, href: mark.attrs.href });
        marks.push(key);
      }
    }

    return [{ _type: "span", _key: nextKey(), text: node.text, marks }];
  });
}

function convertNode(node: TiptapNode): unknown[] {
  // Inline image with Sanity asset reference
  if (node.type === "image") {
    const assetId = node.attrs?.assetId as string | undefined;
    if (!assetId) return [];
    return [
      {
        _type: "image",
        _key: nextKey(),
        asset: { _type: "reference", _ref: assetId },
        alt: (node.attrs?.alt as string) || undefined,
        alignment: (node.attrs?.alignment as string) || "full",
        width: (node.attrs?.width as number) || undefined,
      },
    ];
  }

  // YouTube / Vimeo embed
  if (node.type === "youtube") {
    const src = node.attrs?.src as string | undefined;
    if (!src) return [];
    return [
      {
        _type: "video",
        _key: nextKey(),
        source: "external",
        url: src,
        caption: "",
      },
    ];
  }

  // Uploaded video file
  if (node.type === "videoUpload") {
    const assetId = node.attrs?.assetId as string | undefined;
    if (!assetId) return [];
    return [
      {
        _type: "video",
        _key: nextKey(),
        source: "file",
        file: {
          _type: "file",
          asset: { _type: "reference", _ref: assetId },
        },
        caption: (node.attrs?.caption as string) || "",
      },
    ];
  }

  const headingMap: Record<string, string> = {
    heading: `h${(node.attrs?.level as number) ?? 2}`,
  };

  if (
    node.type === "paragraph" ||
    node.type === "heading" ||
    node.type === "blockquote"
  ) {
    const style =
      node.type === "heading"
        ? headingMap["heading"]
        : node.type === "blockquote"
        ? "blockquote"
        : "normal";

    const markDefs: PortableTextMarkDef[] = [];
    const children = extractSpans(node.content ?? [], markDefs);

    return [
      {
        _type: "block",
        _key: nextKey(),
        style,
        children:
          children.length > 0
            ? children
            : [{ _type: "span", _key: nextKey(), text: "", marks: [] }],
        markDefs,
      } as PortableTextBlock,
    ];
  }

  if (node.type === "bulletList" || node.type === "orderedList") {
    const listItem = node.type === "bulletList" ? "bullet" : "number";
    return (node.content ?? []).flatMap((listItemNode) => {
      const markDefs: PortableTextMarkDef[] = [];
      const children = extractSpans(
        listItemNode.content?.flatMap((p) => p.content ?? []) ?? [],
        markDefs
      );
      return [
        {
          _type: "block",
          _key: nextKey(),
          style: "normal",
          listItem,
          level: 1,
          children:
            children.length > 0
              ? children
              : [{ _type: "span", _key: nextKey(), text: "", marks: [] }],
          markDefs,
        } as PortableTextBlock,
      ];
    });
  }

  // Recurse for doc and other container nodes
  return (node.content ?? []).flatMap(convertNode);
}

export function tiptapToPortableText(tiptapJson: TiptapNode): unknown[] {
  keyCounter = 0;
  return convertNode(tiptapJson);
}
