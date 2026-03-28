"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";

interface Category {
  _id: string;
  title: string;
}

interface Props {
  categories: Category[];
}

export default function SubmitPostForm({ categories }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Write your post content here..." }),
    ],
    editorProps: {
      attributes: {
        class:
          "prose prose-invert max-w-none min-h-[300px] px-4 py-3 focus:outline-none text-gray-200 text-sm leading-relaxed",
      },
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!title.trim()) return setError("Title is required.");
    if (!categoryId) return setError("Please select a category.");
    if (!editor || editor.isEmpty) return setError("Post content cannot be empty.");

    setLoading(true);
    try {
      const body = editor.getJSON();

      const res = await fetch("/api/dashboard/author/submit-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, categoryId, excerpt, body }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/dashboard/author/posts"), 2000);
    } catch {
      setError("Failed to submit post. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-green-900/20 border border-green-500/30 rounded-2xl p-8 text-center">
        <p className="text-green-400 font-semibold text-lg">Post submitted!</p>
        <p className="text-gray-400 text-sm mt-2">
          Your post is pending admin review. Redirecting to your posts...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div>
        <label className="block text-sm text-gray-300 mb-1">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Your post title"
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/60"
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm text-gray-300 mb-1">
          Category <span className="text-red-400">*</span>
        </label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
          className="w-full px-4 py-2.5 bg-[#060d18] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/60"
        >
          <option value="">Select a category...</option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat._id}>
              {cat.title}
            </option>
          ))}
        </select>
      </div>

      {/* Excerpt */}
      <div>
        <label className="block text-sm text-gray-300 mb-1">
          Excerpt / Description
        </label>
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          rows={2}
          placeholder="A short description shown in post lists (optional)"
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/60"
        />
      </div>

      {/* Tiptap Editor */}
      <div>
        <label className="block text-sm text-gray-300 mb-1">
          Content <span className="text-red-400">*</span>
        </label>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-1 px-3 py-2 bg-white/5 border border-b-0 border-white/10 rounded-t-lg">
          {[
            { label: "B", action: () => editor?.chain().focus().toggleBold().run(), active: editor?.isActive("bold") },
            { label: "I", action: () => editor?.chain().focus().toggleItalic().run(), active: editor?.isActive("italic") },
            { label: "H2", action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), active: editor?.isActive("heading", { level: 2 }) },
            { label: "H3", action: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(), active: editor?.isActive("heading", { level: 3 }) },
            { label: "•", action: () => editor?.chain().focus().toggleBulletList().run(), active: editor?.isActive("bulletList") },
            { label: "1.", action: () => editor?.chain().focus().toggleOrderedList().run(), active: editor?.isActive("orderedList") },
            { label: "❝", action: () => editor?.chain().focus().toggleBlockquote().run(), active: editor?.isActive("blockquote") },
          ].map(({ label, action, active }) => (
            <button
              key={label}
              type="button"
              onClick={action}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                active
                  ? "bg-[var(--color-accent)] text-black"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Editor area */}
        <div className="bg-white/5 border border-white/10 rounded-b-lg min-h-[300px]">
          <EditorContent editor={editor} />
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="
          w-full py-3 px-6
          bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)]
          text-white font-semibold rounded-xl
          hover:opacity-90 transition-opacity
          disabled:opacity-50
        "
      >
        {loading ? "Submitting..." : "Submit for Review"}
      </button>
    </form>
  );
}
