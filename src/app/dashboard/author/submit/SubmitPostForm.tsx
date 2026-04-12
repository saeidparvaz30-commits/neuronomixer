"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react";
import { Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import BaseImage from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import { ImageIcon, Video, X, Upload, Loader2, AlertTriangle, Film, Table2 } from "lucide-react";
import { ImageNodeView } from "./ImageNodeView";
import { VideoNodeView } from "./VideoNodeView";

// ── Custom extensions ──────────────────────────────────────────────────────────

// Image with Sanity asset ID, alignment, and width.
const SanityImage = BaseImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      assetId:   { default: null },
      alignment: { default: "full" },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});

// Uploaded video file node.
const VideoUpload = Node.create({
  name: "videoUpload",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      src:     { default: null },
      assetId: { default: null },
      caption: { default: "" },
    };
  },
  parseHTML() {
    return [{ tag: "video[data-asset-id]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["video", { ...HTMLAttributes, controls: true }];
  },
  addNodeView() {
    return ReactNodeViewRenderer(VideoNodeView);
  },
});

// ── Types ──────────────────────────────────────────────────────────────────────

interface Category {
  _id: string;
  title: string;
}

export interface InitialData {
  postId: string;
  title: string;
  categoryId: string;
  excerpt: string;
  metaDescription: string;
  tiptapJson?: object;
  coverImageUrl: string | null;
  coverImageAssetId: string | null;
  currentStatus: string;
}

interface Props {
  categories: Category[];
  initialData?: InitialData;
  redirectTo?: string;
}

interface AltPending {
  file: File;
  objectUrl: string;   // blob URL for preview
  cdnUrl: string | null; // Sanity CDN URL (set after upload completes)
  type: "image" | "video";
  altText: string;
  assetId: string | null;
  uploadError: string | null;
}

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { draftLabel: string; submitLabel: string; showDraft: boolean }
> = {
  draft:    { draftLabel: "Save Draft",          submitLabel: "Submit for Review",           showDraft: true },
  pending:  { draftLabel: "Move to Draft",        submitLabel: "Save Changes",                showDraft: true },
  rejected: { draftLabel: "Save as Draft",        submitLabel: "Resubmit for Review",         showDraft: true },
  approved: { draftLabel: "Revert to Draft",      submitLabel: "Save & Submit for Re-review", showDraft: true },
  new:      { draftLabel: "Save Draft",           submitLabel: "Submit for Review",           showDraft: true },
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function SubmitPostForm({ categories, initialData, redirectTo = "/dashboard/author/posts" }: Props) {
  const router = useRouter();
  const isEditMode = !!initialData?.postId;
  const statusKey = initialData?.currentStatus ?? "new";
  const ui = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.new;

  // ── Form state ──────────────────────────────────────────────────────────────
  const [title, setTitle]               = useState(initialData?.title ?? "");
  const [categoryId, setCategoryId]     = useState(initialData?.categoryId ?? "");
  const [excerpt, setExcerpt]           = useState(initialData?.excerpt ?? "");
  const [metaDescription, setMetaDescription] = useState(initialData?.metaDescription ?? "");
  const [loadingAction, setLoadingAction]     = useState<"draft" | "submit" | null>(null);
  const [error, setError]               = useState("");
  const [successAction, setSuccessAction]     = useState<"draft" | "submit" | null>(null);

  // Cover image
  const [coverPreview, setCoverPreview]     = useState<string | null>(initialData?.coverImageUrl ?? null);
  const [coverAssetId, setCoverAssetId]     = useState<string | null>(initialData?.coverImageAssetId ?? null);
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Body media (image + video file pickers)
  const bodyImageInputRef = useRef<HTMLInputElement>(null);
  const bodyVideoInputRef = useRef<HTMLInputElement>(null);

  // YouTube embed
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [videoUrl, setVideoUrl]             = useState("");

  // Alt text popup (shown after picking/dropping an image or video)
  const [altPending, setAltPending] = useState<AltPending | null>(null);

  // Drag-over visual feedback
  const [isDragOver, setIsDragOver] = useState(false);

  // Floating toolbar (visible when main toolbar scrolls out of view)
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Stable ref so ProseMirror's handleDrop always calls the latest handleInsertFile
  const handleDropFileRef = useRef<(file: File, type: "image" | "video") => void>(() => {});

  // Stable ref so ProseMirror's handlePaste always calls the latest paste handler
  const handlePasteRef = useRef<(event: ClipboardEvent) => boolean>(() => false);

  // ── Editor ──────────────────────────────────────────────────────────────────
  const editor = useEditor({
    immediatelyRender: !!initialData?.tiptapJson,
    content: initialData?.tiptapJson ?? undefined,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Write your post content here…" }),
      SanityImage.configure({ allowBase64: false }),
      VideoUpload,
      Youtube.configure({ controls: true, nocookie: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    editorProps: {
      attributes: {
        class:
          "prose prose-invert max-w-none min-h-[400px] px-4 py-3 focus:outline-none text-gray-200 text-sm leading-relaxed",
      },
      handlePaste: (_view, event) => handlePasteRef.current(event),
      handleDrop: (_view, event, _slice, _moved) => {
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;
        const file = files[0];
        if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
          event.preventDefault();
          handleDropFileRef.current(
            file,
            file.type.startsWith("image/") ? "image" : "video"
          );
          return true;
        }
        return false;
      },
    },
  });

  // ── IntersectionObserver: floating toolbar ──────────────────────────────────
  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setToolbarVisible(entry.isIntersecting),
      { threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ── Cover image ─────────────────────────────────────────────────────────────
  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    setCoverPreview(URL.createObjectURL(file));
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/dashboard/author/upload-asset", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) setCoverAssetId(data._id);
      else setError("Cover image upload failed.");
    } catch {
      setError("Cover image upload failed.");
    } finally {
      setCoverUploading(false);
    }
  }

  function removeCover() {
    setCoverPreview(null);
    setCoverAssetId(null);
    if (coverInputRef.current) coverInputRef.current.value = "";
  }

  // ── Insert file (image or video) — shows alt text popup ────────────────────
  function handleInsertFile(file: File, type: "image" | "video") {
    const objectUrl = URL.createObjectURL(file);
    setAltPending({ file, objectUrl, cdnUrl: null, type, altText: "", assetId: null, uploadError: null });

    const fd = new FormData();
    fd.append("file", file);
    fetch("/api/dashboard/author/upload-asset", { method: "POST", body: fd })
      .then((r) => r.json())
      .then((data) => {
        if (data._id) {
          setAltPending((prev) =>
            prev ? { ...prev, assetId: data._id, cdnUrl: data.url ?? null } : null
          );
        } else {
          setAltPending((prev) =>
            prev ? { ...prev, uploadError: "Upload failed. Please try again." } : null
          );
        }
      })
      .catch(() => {
        setAltPending((prev) =>
          prev ? { ...prev, uploadError: "Upload failed. Please check your connection." } : null
        );
      });
  }

  // Actually insert the pending asset into the editor
  function insertPendingAsset() {
    if (!altPending || !altPending.assetId || !editor) return;
    const { type, cdnUrl, objectUrl, assetId, altText } = altPending;
    const src = cdnUrl ?? objectUrl;

    if (type === "image") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (editor.chain().focus() as any)
        .setImage({ src, alt: altText, assetId })
        .run();
    } else {
      editor.chain().focus().insertContent({
        type: "videoUpload",
        attrs: { src, assetId, caption: altText },
      }).run();
    }

    URL.revokeObjectURL(altPending.objectUrl);
    setAltPending(null);
  }

  function cancelAltPending() {
    if (altPending) URL.revokeObjectURL(altPending.objectUrl);
    setAltPending(null);
  }

  // ── Table paste helpers ─────────────────────────────────────────────────────
  function insertTableFromRows(rows: string[][]) {
    if (!editor || !rows.length) return;
    const [headerRow, ...bodyRows] = rows;
    editor.chain().focus().insertContent({
      type: "table",
      content: [
        {
          type: "tableRow",
          content: headerRow.map((cell) => ({
            type: "tableHeader",
            content: [{ type: "paragraph", content: [{ type: "text", text: cell }] }],
          })),
        },
        ...bodyRows.map((row) => ({
          type: "tableRow",
          content: row.map((cell) => ({
            type: "tableCell",
            content: [{ type: "paragraph", content: [{ type: "text", text: cell }] }],
          })),
        })),
      ],
    }).run();
  }

  // ── Body image / video pickers ──────────────────────────────────────────────
  function handleBodyImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    handleInsertFile(file, "image");
    if (bodyImageInputRef.current) bodyImageInputRef.current.value = "";
  }

  function handleBodyVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    handleInsertFile(file, "video");
    if (bodyVideoInputRef.current) bodyVideoInputRef.current.value = "";
  }

  // ── YouTube / Vimeo embed ───────────────────────────────────────────────────
  function insertVideo() {
    if (!videoUrl.trim() || !editor) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (editor.chain().focus() as any).setYoutubeVideo({ src: videoUrl.trim() }).run();
    setVideoUrl("");
    setShowVideoInput(false);
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  async function handleSave(action: "draft" | "submit") {
    setError("");

    if (!title.trim())           return setError("Title is required.");
    if (!categoryId)             return setError("Please select a category.");
    if (!editor || editor.isEmpty) return setError("Post content cannot be empty.");
    if (coverUploading)
      return setError("Please wait for the cover image to finish uploading.");
    if (action === "submit" && !coverAssetId)
      return setError("A header image is required before submitting for review.");

    setLoadingAction(action);
    try {
      const payload = {
        title,
        categoryId,
        excerpt,
        metaDescription: metaDescription.trim().slice(0, 160) || undefined,
        body: editor.getJSON(),
        coverImageAssetId: coverAssetId ?? null,
        action,
        ...(isEditMode ? { postId: initialData!.postId } : {}),
      };

      const url = isEditMode
        ? "/api/dashboard/author/update-post"
        : "/api/dashboard/author/submit-post";

      const res = await fetch(url, {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: { error?: string; success?: boolean } = {};
      try {
        data = await res.json();
      } catch {
        setError("Server error — check browser console for details.");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      setSuccessAction(action);
      setTimeout(() => router.push(redirectTo), 1500);
    } catch (err) {
      console.error("[SubmitPostForm] save error:", err);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoadingAction(null);
    }
  }

  // Keep refs current on every render
  handleDropFileRef.current = handleInsertFile;
  handlePasteRef.current = (event: ClipboardEvent) => {
    const text = event.clipboardData?.getData("text/plain") ?? "";
    const html = event.clipboardData?.getData("text/html") ?? "";

    // HTML table (Excel copy, Word table) — let Tiptap handle natively
    if (html.includes("<table")) return false;

    const lines = text.trim().split("\n").filter((l) => l.trim() !== "");
    if (!lines.length) return false;

    // Markdown table: every line starts and ends with |
    const isMarkdown = lines.every(
      (l) => l.trim().startsWith("|") && l.trim().endsWith("|")
    );
    if (isMarkdown) {
      const rows = lines
        .filter((l) => !/^\s*\|[\s\-:|]+\|\s*$/.test(l)) // skip separator rows
        .map((l) =>
          l.trim().slice(1, -1).split("|").map((c) => c.trim())
        );
      if (rows.length) { insertTableFromRows(rows); return true; }
    }

    // TSV (tab-separated) — Excel plain-text fallback
    if (lines.some((l) => l.includes("\t"))) {
      const rows = lines.map((l) => l.split("\t"));
      insertTableFromRows(rows);
      return true;
    }

    return false;
  };

  // ── Success state ────────────────────────────────────────────────────────────
  if (successAction) {
    return (
      <div className="bg-green-900/20 border border-green-500/30 rounded-2xl p-8 text-center">
        <p className="text-green-400 font-semibold text-lg">
          {successAction === "draft" ? "Draft saved!" : isEditMode ? "Changes submitted!" : "Post submitted!"}
        </p>
        <p className="text-gray-400 text-sm mt-2">Redirecting to your posts…</p>
      </div>
    );
  }

  // ── Shared toolbar button style ──────────────────────────────────────────────
  const toolbarBtn = (active: boolean) =>
    `px-2.5 py-1 text-xs font-medium rounded transition-colors ${
      active
        ? "bg-[var(--color-accent)] text-black"
        : "text-gray-400 hover:text-white hover:bg-white/10"
    }`;

  // ── Toolbar button renderers (shared between main + floating) ────────────────
  function renderToolbarButtons(compact = false) {
    const sep = compact
      ? <div className="h-px w-full bg-white/15 my-0.5" />
      : <div className="w-px h-4 bg-white/15 mx-0.5" />;

    return (
      <>
        <button type="button" title="Bold"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={toolbarBtn(!!editor?.isActive("bold"))}>B</button>
        <button type="button" title="Italic"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={`${toolbarBtn(!!editor?.isActive("italic"))} italic`}>I</button>
        {sep}
        {([2, 3, 4] as const).map((lvl) => (
          <button key={lvl} type="button" title={`Heading ${lvl}`}
            onClick={() => editor?.chain().focus().toggleHeading({ level: lvl }).run()}
            className={toolbarBtn(!!editor?.isActive("heading", { level: lvl }))}>
            H{lvl}
          </button>
        ))}
        {sep}
        <button type="button" title="Bullet list"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={toolbarBtn(!!editor?.isActive("bulletList"))}>•</button>
        <button type="button" title="Ordered list"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className={toolbarBtn(!!editor?.isActive("orderedList"))}>1.</button>
        <button type="button" title="Blockquote"
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          className={toolbarBtn(!!editor?.isActive("blockquote"))}>❝</button>
        {sep}
        {/* Image upload */}
        <button type="button" title="Insert image or GIF"
          onClick={() => bodyImageInputRef.current?.click()}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors text-gray-400 hover:text-white hover:bg-white/10 ${compact ? "justify-center" : ""}`}>
          <ImageIcon size={11} />
          {!compact && "Image"}
        </button>
        {/* Video file upload */}
        <button type="button" title="Upload video file"
          onClick={() => bodyVideoInputRef.current?.click()}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors text-gray-400 hover:text-white hover:bg-white/10 ${compact ? "justify-center" : ""}`}>
          <Film size={11} />
          {!compact && "Video"}
        </button>
        {/* YouTube embed */}
        <button type="button" title="Embed YouTube / Vimeo URL"
          onClick={() => setShowVideoInput((v) => !v)}
          className={`flex items-center gap-1 ${toolbarBtn(showVideoInput)} ${compact ? "justify-center" : ""}`}>
          <Video size={11} />
          {!compact && "YouTube"}
        </button>
        {/* Insert table */}
        <button type="button" title="Insert table (or paste from Excel/Word/Markdown)"
          onClick={() =>
            editor?.chain().focus().insertContent({
              type: "table",
              content: Array.from({ length: 3 }, (_, r) => ({
                type: "tableRow",
                content: Array.from({ length: 3 }, () => ({
                  type: r === 0 ? "tableHeader" : "tableCell",
                  content: [{ type: "paragraph", content: [] }],
                })),
              })),
            }).run()
          }
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors text-gray-400 hover:text-white hover:bg-white/10 ${compact ? "justify-center" : ""}`}>
          <Table2 size={11} />
          {!compact && "Table"}
        </button>
      </>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Alt text popup ──────────────────────────────────────────────────── */}
      {altPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0d1b2e] border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/10">
              <p className="text-sm font-semibold text-white">
                {altPending.type === "image" ? "Add image alt text" : "Add video caption"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {altPending.type === "image"
                  ? "Describe the image for screen readers and SEO (optional)."
                  : "Add a caption shown below the video (optional)."}
              </p>
            </div>

            {/* Preview */}
            <div className="px-5 pt-4">
              {altPending.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={altPending.objectUrl}
                  alt="Preview"
                  className="w-full max-h-48 object-contain rounded-lg bg-black/40"
                />
              ) : (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video
                  src={altPending.objectUrl}
                  className="w-full max-h-48 rounded-lg bg-black/40"
                  controls
                />
              )}
            </div>

            {/* Input */}
            <div className="px-5 pt-4 pb-2">
              <input
                type="text"
                autoFocus
                value={altPending.altText}
                onChange={(e) =>
                  setAltPending((prev) => prev ? { ...prev, altText: e.target.value } : null)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && altPending.assetId) { e.preventDefault(); insertPendingAsset(); }
                  if (e.key === "Escape") cancelAltPending();
                }}
                placeholder={altPending.type === "image" ? "e.g. A bar chart showing monthly revenue…" : "e.g. Product demo walkthrough…"}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/60"
              />

              {/* Upload status */}
              <div className="mt-2 min-h-[20px]">
                {altPending.uploadError ? (
                  <p className="text-xs text-red-400">{altPending.uploadError}</p>
                ) : !altPending.assetId ? (
                  <p className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Loader2 size={11} className="animate-spin" /> Uploading…
                  </p>
                ) : (
                  <p className="text-xs text-green-500">Upload complete.</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelAltPending}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={insertPendingAsset}
                disabled={!altPending.assetId}
                className="px-4 py-2 text-sm font-semibold bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/80 text-white rounded-lg transition-colors disabled:opacity-40"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating toolbar (fixed right side, shown when main toolbar scrolls out) ── */}
      {!toolbarVisible && editor && (
        <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col items-stretch gap-0.5 p-2 bg-gray-900/95 border border-white/20 rounded-xl shadow-2xl backdrop-blur-sm">
          {renderToolbarButtons(true)}
        </div>
      )}

      {/* ── Approved-post warning ────────────────────────────────────────────── */}
      {statusKey === "approved" && (
        <div className="flex gap-3 items-start bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-300">
            This post is currently live. Saving changes will send it back for admin review.
            The post will remain visible until the admin approves the new version.
          </p>
        </div>
      )}

      {/* ── Cover Image ─────────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm text-gray-300 mb-1">Cover Image</label>
        {coverPreview ? (
          <div className="relative rounded-xl overflow-hidden h-48 bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
            {coverUploading ? (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2">
                <Loader2 size={20} className="animate-spin text-white" />
                <span className="text-white text-xs">Uploading…</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={removeCover}
                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="w-full h-32 border-2 border-dashed border-white/10 hover:border-[var(--color-accent)]/50 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <Upload size={18} />
            <span className="text-xs">Click to upload cover image (PNG, JPG, GIF, WebP)</span>
          </button>
        )}
        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
      </div>

      {/* ── Title ───────────────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm text-gray-300 mb-1">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Your post title"
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/60"
        />
      </div>

      {/* ── Category ────────────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm text-gray-300 mb-1">
          Category <span className="text-red-400">*</span>
        </label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full px-4 py-2.5 bg-[#060d18] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/60"
        >
          <option value="">Select a category…</option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat._id}>{cat.title}</option>
          ))}
        </select>
      </div>

      {/* ── Excerpt ─────────────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm text-gray-300 mb-1">Excerpt / Description</label>
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          rows={2}
          placeholder="A short description shown in post lists (optional)"
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/60"
        />
      </div>

      {/* ── Meta Description ────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm text-gray-300 mb-1">
          Meta Description
          <span className="ml-2 text-xs text-gray-500">(SEO — shown in Google search results, max 160 chars)</span>
        </label>
        <textarea
          value={metaDescription}
          onChange={(e) => setMetaDescription(e.target.value)}
          rows={2}
          maxLength={160}
          placeholder="Concise description for search engines (optional, falls back to excerpt if omitted)"
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/60"
        />
        <p className="text-xs text-gray-600 mt-0.5 text-right">{metaDescription.length}/160</p>
      </div>

      {/* ── Tiptap Editor ───────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm text-gray-300 mb-1">
          Content <span className="text-red-400">*</span>
        </label>

        {/* Main toolbar */}
        <div
          ref={toolbarRef}
          className="flex flex-wrap items-center gap-1 px-3 py-2 bg-white/5 border border-b-0 border-white/10 rounded-t-lg"
        >
          {renderToolbarButtons(false)}
        </div>

        {/* YouTube URL input */}
        {showVideoInput && (
          <div className="flex gap-2 px-3 py-2 bg-white/5 border-x border-white/10">
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); insertVideo(); }
                if (e.key === "Escape") setShowVideoInput(false);
              }}
              placeholder="Paste YouTube or Vimeo URL and press Enter…"
              autoFocus
              className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/60"
            />
            <button type="button" onClick={insertVideo}
              className="px-3 py-1.5 bg-[var(--color-accent)] text-black text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity">
              Insert
            </button>
            <button type="button" onClick={() => setShowVideoInput(false)}
              className="px-2 py-1.5 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10">
              <X size={12} />
            </button>
          </div>
        )}

        {/* Hidden file inputs */}
        <input ref={bodyImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleBodyImageChange} />
        <input ref={bodyVideoInputRef} type="file" accept="video/*" className="hidden" onChange={handleBodyVideoChange} />

        {/* Editor area with drag-drop */}
        <div
          className={`relative bg-white/5 border border-white/10 rounded-b-lg min-h-[400px] transition-all ${
            isDragOver ? "ring-2 ring-[var(--color-accent)]/60 bg-[var(--color-accent)]/5" : ""
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Element)) setIsDragOver(false);
          }}
          onDrop={() => setIsDragOver(false)}
        >
          <EditorContent editor={editor} />

          {isDragOver && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="bg-gray-900/90 border border-[var(--color-accent)]/40 rounded-xl px-6 py-3">
                <p className="text-[var(--color-accent)] font-medium text-sm">
                  Drop image or video to insert
                </p>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-600 mt-1">
          Drag & drop images or videos directly into the editor, or use the toolbar above.
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* ── Action buttons ───────────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-1">
        {ui.showDraft && (
          <button
            type="button"
            onClick={() => handleSave("draft")}
            disabled={!!loadingAction || coverUploading}
            className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-medium rounded-xl transition-colors disabled:opacity-50 text-sm"
          >
            {loadingAction === "draft" ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Saving…
              </span>
            ) : (
              ui.draftLabel
            )}
          </button>
        )}

        <button
          type="button"
          onClick={() => handleSave("submit")}
          disabled={!!loadingAction || coverUploading}
          className="flex-1 py-3 px-6 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
        >
          {loadingAction === "submit" ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Saving…
            </span>
          ) : (
            ui.submitLabel
          )}
        </button>
      </div>
    </div>
  );
}
