"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Calendar, X } from "lucide-react";
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
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");

  // min date = tomorrow (no point scheduling for today if we publish immediately)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().slice(0, 16);

  async function handleApprove() {
    setLoading("approve");
    try {
      await fetch("/api/dashboard/admin/approve-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post._id,
          scheduledAt: scheduledAt || undefined,
        }),
      });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    setLoading("reject");
    try {
      await fetch("/api/dashboard/admin/reject-post", {
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

  const isScheduled = !!scheduledAt;

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

        <div className="flex gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors border border-white/10"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? "Hide" : "Preview"}
          </button>
          <button
            onClick={() => setShowScheduler((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors border ${
              isScheduled
                ? "bg-blue-600/20 text-blue-400 border-blue-500/40"
                : "bg-white/5 hover:bg-white/10 text-gray-300 border-white/10"
            }`}
          >
            <Calendar size={14} />
            {isScheduled
              ? new Date(scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "Schedule"}
          </button>
          <button
            onClick={handleApprove}
            disabled={!!loading}
            className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {loading === "approve" ? "..." : isScheduled ? "Approve & Schedule" : "Approve Now"}
          </button>
          <button
            onClick={handleReject}
            disabled={!!loading}
            className="px-4 py-2 text-sm font-medium bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {loading === "reject" ? "..." : "Reject"}
          </button>
        </div>
      </div>

      {/* Schedule picker panel */}
      {showScheduler && (
        <div className="border-t border-white/10 bg-[#0a1628] px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-white mb-1">Publish date & time</p>
            <p className="text-xs text-gray-500">
              Leave empty to publish immediately when you click Approve. Set a future date to schedule.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="datetime-local"
              value={scheduledAt}
              min={minDate}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="px-3 py-2 rounded-lg border border-white/15 bg-[#060d18] text-white text-sm focus:outline-none focus:border-[var(--color-accent)]/60"
            />
            {scheduledAt && (
              <button
                onClick={() => setScheduledAt("")}
                className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                title="Clear date"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

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
