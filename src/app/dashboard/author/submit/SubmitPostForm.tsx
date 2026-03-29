"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import BaseImage from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import { ImageIcon, Video, X, Upload, Loader2, AlertTriangle } from "lucide-react";
import { ImageNodeView } from "./ImageNodeView";

// Extend the base Image extension with Sanity asset ID, alignment, and width.
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

interface Category {
  _id: string;
  title: string;
}

export interface InitialData {
  postId: string;
  title: string;
  categoryId: string;
  excerpt: string;
  tiptapJson?: object;
  coverImageUrl: string | null;
  coverImageAssetId: string | null;
  currentStatus: string;
}

interface Props {
  categories: Category[];
  initialData?: InitialData;
}

// Per-status UI config
const STATUS_CONFIG: Record<
  string,
  { draftLabel: string; submitLabel: string; showDraft: boolean }
> = {
  draft:    { draftLabel: "Save Draft",          submitLabel: "Submit for Review",     showDraft: true  },
  pending:  { draftLabel: "Move to Draft",        submitLabel: "Save Changes",          showDraft: true  },
  rejected: { draftLabel: "Save as Draft",        submitLabel: "Resubmit for Review",   showDraft: true  },
  approved: { draftLabel: "Revert to Draft",      submitLabel: "Save & Submit for Re-review", showDraft: true  },
  new:      { draftLabel: "Save Draft",           submitLabel: "Submit for Review",     showDraft: true  },
};

export default function SubmitPostForm({ categories, initialData }: Props) {
  const router = useRouter();
  const isEditMode = !!initialData?.postId;
  const statusKey = initialData?.currentStatus ?? "new";
  const ui = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.new;

  // ── Form state ────────────────────────────────────────────────────────────
  const [title, setTitle]         = useState(initialData?.title ?? "");
  const [categoryId, setCategoryId] = useState(initialData?.categoryId ?? "");
  const [excerpt, setExcerpt]     = useState(initialData?.excerpt ?? "");
  const [loadingAction, setLoadingAction] = useState<"draft" | "submit" | null>(null);
  const [error, setError]         = useState("");
  const [successAction, setSuccessAction] = useState<"draft" | "submit" | null>(null);

  // Cover image
  const [coverPreview, setCoverPreview]   = useState<string | null>(initialData?.coverImageUrl ?? null);
  const [coverAssetId, setCoverAssetId]   = useState<string | null>(initialData?.coverImageAssetId ?? null);
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Body image
  const [bodyImageUploading, setBodyImageUploading] = useState(false);
  const bodyImageInputRef = useRef<HTMLInputElement>(null);

  // YouTube
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");

  const editor = useEditor({
    immediatelyRender: false,
    content: initialData?.tiptapJson ?? undefined,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Write your post content here…" }),
      SanityImage.configure({ allowBase64: false }),
      Youtube.configure({ controls: true, nocookie: true }),
    ],
    editorProps: {
      attributes: {
        class:
          "prose prose-invert max-w-none min-h-[400px] px-4 py-3 focus:outline-none text-gray-200 text-sm leading-relaxed",
      },
    },
  });

  // ── Cover image ────────────────────────────────────────────────────────────
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

  // ── Body image insert ──────────────────────────────────────────────────────
  async function handleBodyImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    setBodyImageUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/dashboard/author/upload-asset", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (editor.chain().focus() as any)
          .setImage({ src: data.url, alt: file.name, assetId: data._id })
          .run();
      }
    } catch {
      // ignore — image just won't be inserted
    } finally {
      setBodyImageUploading(false);
      if (bodyImageInputRef.current) bodyImageInputRef.current.value = "";
    }
  }

  // ── YouTube embed ──────────────────────────────────────────────────────────
  function insertVideo() {
    if (!videoUrl.trim() || !editor) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (editor.chain().focus() as any).setYoutubeVideo({ src: videoUrl.trim() }).run();
    setVideoUrl("");
    setShowVideoInput(false);
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  async function handleSave(action: "draft" | "submit") {
    setError("");

    if (!title.trim()) return setError("Title is required.");
    if (!categoryId) return setError("Please select a category.");
    if (!editor || editor.isEmpty) return setError("Post content cannot be empty.");
    if (coverUploading || bodyImageUploading)
      return setError("Please wait for uploads to finish.");

    setLoadingAction(action);
    try {
      const payload = {
        title,
        categoryId,
        excerpt,
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

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      setSuccessAction(action);
      setTimeout(() => router.push("/dashboard/author/posts"), 1500);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setLoadingAction(null);
    }
  }

  // ── Success state ──────────────────────────────────────────────────────────
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

  const toolbarBtn = (active: boolean) =>
    `px-2.5 py-1 text-xs font-medium rounded transition-colors ${
      active
        ? "bg-[var(--color-accent)] text-black"
        : "text-gray-400 hover:text-white hover:bg-white/10"
    }`;

  return (
    <div className="space-y-5">

      {/* ── Approved-post warning ────────────────────────────────────────── */}
      {statusKey === "approved" && (
        <div className="flex gap-3 items-start bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-300">
            This post is currently live. Saving changes will send it back for admin review.
            The post will remain visible until the admin approves the new version.
          </p>
        </div>
      )}

      {/* ── Cover Image ──────────────────────────────────────────────────── */}
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

      {/* ── Title ────────────────────────────────────────────────────────── */}
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

      {/* ── Category ─────────────────────────────────────────────────────── */}
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

      {/* ── Excerpt ──────────────────────────────────────────────────────── */}
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

      {/* ── Tiptap Editor ────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm text-gray-300 mb-1">
          Content <span className="text-red-400">*</span>
        </label>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1 px-3 py-2 bg-white/5 border border-b-0 border-white/10 rounded-t-lg">
          <button type="button" title="Bold"   onClick={() => editor?.chain().focus().toggleBold().run()}   className={toolbarBtn(!!editor?.isActive("bold"))}>B</button>
          <button type="button" title="Italic" onClick={() => editor?.chain().focus().toggleItalic().run()} className={`${toolbarBtn(!!editor?.isActive("italic"))} italic`}>I</button>
          <div className="w-px h-4 bg-white/15 mx-0.5" />
          {([2, 3, 4] as const).map((lvl) => (
            <button key={lvl} type="button" title={`Heading ${lvl}`}
              onClick={() => editor?.chain().focus().toggleHeading({ level: lvl }).run()}
              className={toolbarBtn(!!editor?.isActive("heading", { level: lvl }))}>
              H{lvl}
            </button>
          ))}
          <div className="w-px h-4 bg-white/15 mx-0.5" />
          <button type="button" title="Bullet list"  onClick={() => editor?.chain().focus().toggleBulletList().run()}  className={toolbarBtn(!!editor?.isActive("bulletList"))}>•</button>
          <button type="button" title="Ordered list" onClick={() => editor?.chain().focus().toggleOrderedList().run()} className={toolbarBtn(!!editor?.isActive("orderedList"))}>1.</button>
          <button type="button" title="Blockquote"   onClick={() => editor?.chain().focus().toggleBlockquote().run()}  className={toolbarBtn(!!editor?.isActive("blockquote"))}>❝</button>
          <div className="w-px h-4 bg-white/15 mx-0.5" />
          <button type="button" title="Insert image or GIF"
            onClick={() => bodyImageInputRef.current?.click()}
            disabled={bodyImageUploading}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-40">
            {bodyImageUploading ? <Loader2 size={11} className="animate-spin" /> : <ImageIcon size={11} />}
            Image
          </button>
          <button type="button" title="Embed YouTube / Vimeo"
            onClick={() => setShowVideoInput((v) => !v)}
            className={`flex items-center gap-1 ${toolbarBtn(showVideoInput)}`}>
            <Video size={11} />
            Video
          </button>
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

        <input ref={bodyImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleBodyImageChange} />

        <div className="bg-white/5 border border-white/10 rounded-b-lg min-h-[400px]">
          <EditorContent editor={editor} />
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* ── Action buttons ────────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-1">
        {ui.showDraft && (
          <button
            type="button"
            onClick={() => handleSave("draft")}
            disabled={!!loadingAction || coverUploading || bodyImageUploading}
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
          disabled={!!loadingAction || coverUploading || bodyImageUploading}
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
