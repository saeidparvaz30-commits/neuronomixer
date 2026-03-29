"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";

export default function NewCategoryForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/admin/create-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      setTitle("");
      setDescription("");
      setOpen(false);
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
          onClick={() => { setOpen(false); setError(""); }}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white bg-white/5 border border-white/10 rounded-xl transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
