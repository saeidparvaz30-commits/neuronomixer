"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";
import RichText from "@/components/Blog/RichText";

interface PendingPost {
  _id: string;
  title: string;
  submittedBy?: string;
  _createdAt: string;
  author?: { name: string };
  category?: { title: string };
  body?: unknown[];
  mainImage?: { asset?: { url: string } };
}

export default function PostReviewRow({ post }: { post: PendingPost }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [expanded, setExpanded] = useState(false);

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
    <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl overflow-hidden">
      {/* Header row */}
      <div className="p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
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
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors border border-white/10"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? "Hide" : "Preview"}
          </button>
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

      {/* Expandable preview */}
      {expanded && (
        <div className="border-t border-white/10 bg-white rounded-b-2xl px-6 py-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{post.title}</h2>

          {post.mainImage?.asset?.url && (
            <Image
              src={post.mainImage.asset.url}
              alt={post.title}
              width={1200}
              height={500}
              className="w-full h-60 object-cover rounded-xl mb-6"
            />
          )}

          {post.body && post.body.length > 0 ? (
            <article className="prose prose-sm sm:prose lg:prose-lg max-w-none text-left">
              <RichText value={post.body as any} />
            </article>
          ) : (
            <p className="text-gray-400 italic text-sm">No body content submitted.</p>
          )}
        </div>
      )}
    </div>
  );
}
