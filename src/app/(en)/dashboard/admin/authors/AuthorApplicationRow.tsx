"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SanityAuthor } from "./page";

export default function AuthorApplicationRow({ author }: { author: SanityAuthor }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [expanded, setExpanded] = useState(false);

  async function handleAction(action: "approve" | "reject") {
    setLoading(action);
    try {
      await fetch(`/api/dashboard/admin/${action}-author`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sanityAuthorId: author._id, userId: author.userId }),
      });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  const appliedDate = author.appliedAt
    ? new Date(author.appliedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl overflow-hidden">
      {/* Header row */}
      <div className="p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-white">{author.name}</p>
            {appliedDate && (
              <span className="text-xs text-gray-500">Applied {appliedDate}</span>
            )}
          </div>
          {author.email && (
            <p className="text-sm text-gray-400">{author.email}</p>
          )}
          {author.shortBio && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{author.shortBio}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="px-3 py-2 text-sm font-medium bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors border border-white/10"
          >
            {expanded ? "Hide" : "View Application"}
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

      {/* Expandable application details */}
      {expanded && (
        <div className="border-t border-white/10 px-5 py-4 space-y-4 bg-white/[0.02]">
          {(author.jobTitle || author.employer) && (
            <div className="flex gap-6">
              {author.jobTitle && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Job Title</p>
                  <p className="text-sm text-gray-300">{author.jobTitle}</p>
                </div>
              )}
              {author.employer && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Employer</p>
                  <p className="text-sm text-gray-300">{author.employer}</p>
                </div>
              )}
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Short Bio
            </p>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">
              {author.shortBio || <span className="text-gray-600 italic">Not provided</span>}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Why they want to write for NeuroNomixer
            </p>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">
              {author.motivation || <span className="text-gray-600 italic">Not provided</span>}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
