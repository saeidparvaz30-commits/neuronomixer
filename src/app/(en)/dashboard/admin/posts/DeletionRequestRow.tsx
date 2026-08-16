"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X, Loader2 } from "lucide-react";

interface DeletionPost {
  _id: string;
  title: string;
  submittedBy?: string;
  _createdAt: string;
  author?: { name: string };
  category?: { title: string };
}

export default function DeletionRequestRow({ post }: { post: DeletionPost }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"delete" | "reject" | null>(null);

  async function handleAction(action: "delete" | "reject") {
    setLoading(action);
    try {
      const url =
        action === "delete"
          ? "/api/dashboard/admin/delete-post"
          : "/api/dashboard/admin/reject-deletion";
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post._id }),
      });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="bg-orange-950/20 border border-orange-500/20 rounded-2xl p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white line-clamp-1">{post.title}</p>
        <div className="flex flex-wrap gap-3 mt-1">
          {post.author?.name && (
            <span className="text-xs text-gray-400">by {post.author.name}</span>
          )}
          {post.category?.title && (
            <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full">
              {post.category.title}
            </span>
          )}
          <span className="text-xs text-gray-500">
            {new Date(post._createdAt).toLocaleDateString("en-US", {
              year: "numeric", month: "short", day: "numeric",
            })}
          </span>
        </div>
      </div>

      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => handleAction("reject")}
          disabled={!!loading}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors border border-white/10 disabled:opacity-50"
        >
          {loading === "reject" ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
          Keep Published
        </button>
        <button
          onClick={() => handleAction("delete")}
          disabled={!!loading}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {loading === "delete" ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          Confirm Delete
        </button>
      </div>
    </div>
  );
}
