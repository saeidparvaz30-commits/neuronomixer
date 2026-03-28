"use client";

import { useState } from "react";

export default function SuggestCategoryPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/author/suggest-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();
      setResult(data);
      if (data.success) { setName(""); setDescription(""); }
    } catch {
      setResult({ error: "Failed to send suggestion." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-white mb-2">Suggest a Category</h1>
      <p className="text-sm text-gray-500 mb-6">
        Have an idea for a new content category? Let us know.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1">Category Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Machine Learning"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/60"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">Why this category?</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Briefly describe what this category would cover..."
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/60"
          />
        </div>

        {result?.success && (
          <p className="text-sm text-green-400">Suggestion sent! We&apos;ll review it.</p>
        )}
        {result?.error && <p className="text-sm text-red-400">{result.error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[var(--color-accent)] text-black font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send Suggestion"}
        </button>
      </form>
    </div>
  );
}
