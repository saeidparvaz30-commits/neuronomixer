"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PendingPost {
  _id: string;
  title: string;
  submittedBy?: string;
  _createdAt: string;
  author?: { name: string };
  category?: { title: string };
}

export default function PostReviewRow({ post }: { post: PendingPost }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  async function handleAction(action: "approve" | "reject") {
    setLoading(action);
    try {
      await fetch(`/api/dashboard/admin/${action}-post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post._id }),
      });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  const submittedDate = new Date(post._createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white line-clamp-1">{post.title}</p>
        <div className="flex flex-wrap gap-3 mt-1">
          {post.author?.name && (
            <span className="text-xs text-gray-400">by {post.author.name}</span>
          )}
          {post.category?.title && (
            <span className="text-xs bg-[var(--color-accent)]/20 text-[var(--color-accent)] px-2 py-0.5 rounded-full">
              {post.category.title}
            </span>
          )}
          <span className="text-xs text-gray-500">{submittedDate}</span>
        </div>
      </div>

      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => handleAction("approve")}
          disabled={!!loading}
          className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {loading === "approve" ? "..." : "Approve"}
        </button>
        <button
          onClick={() => handleAction("reject")}
          disabled={!!loading}
          className="px-4 py-2 text-sm font-medium bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {loading === "reject" ? "..." : "Reject"}
        </button>
      </div>
    </div>
  );
}
