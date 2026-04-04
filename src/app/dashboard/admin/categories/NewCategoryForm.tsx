"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, ImagePlus, X } from "lucide-react";

export default function NewCategoryForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImagePreview(null);
    }
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function reset() {
    setTitle("");
    setDescription("");
    clearImage();
    setError("");
    setOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      if (description.trim()) formData.append("description", description);
      if (imageFile) formData.append("image", imageFile);

      const res = await fetch("/api/dashboard/admin/create-category", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      reset();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-4 py-2 bg-[var(--color-accent)] text-black text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
      >
        <Plus size={15} />
        New Category
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#060d18]/80 border border-[var(--color-accent)]/30 rounded-2xl p-5 flex flex-col gap-4"
    >
      <p className="text-sm font-semibold text-white">New Category</p>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. Machine Learning"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description (optional)"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50"
          />
        </div>
      </div>

      {/* Cover image */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Cover Image</label>
        {imagePreview ? (
          <div className="relative w-full h-32 rounded-xl overflow-hidden border border-white/10 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={clearImage}
              className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-24 flex flex-col items-center justify-center gap-1.5 border border-dashed border-white/15 rounded-xl text-gray-500 hover:border-[var(--color-accent)]/40 hover:text-gray-400 transition-colors"
          >
            <ImagePlus size={18} />
            <span className="text-xs">Click to upload cover image</span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 bg-[var(--color-accent)] text-black text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Create
        </button>
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white bg-white/5 border border-white/10 rounded-xl transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
