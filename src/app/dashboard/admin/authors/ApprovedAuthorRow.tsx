"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

interface Props {
  authorId: string;
  name: string;
  email?: string;
  postCount: number;
}

export default function ApprovedAuthorRow({ authorId, name, email, postCount }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      await fetch("/api/dashboard/admin/delete-sanity-author", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorId }),
      });
      router.refresh();
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  return (
    <tr className="hover:bg-white/5 transition-colors text-sm">
      <td className="px-4 py-3 text-white font-medium">{name}</td>
      <td className="px-4 py-3 text-gray-400 text-xs">{email ?? "—"}</td>
      <td className="px-4 py-3 text-gray-500 text-xs">{postCount} post{postCount !== 1 ? "s" : ""}</td>
      <td className="px-4 py-3">
        {confirming ? (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 size={11} className="animate-spin" /> : "Confirm"}
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="px-2.5 py-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex justify-end">
            <button
              onClick={() => setConfirming(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white/5 hover:bg-red-900/40 text-gray-400 hover:text-red-400 border border-white/10 hover:border-red-700/40 rounded-lg transition-colors"
            >
              <Trash2 size={11} />
              Remove
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
