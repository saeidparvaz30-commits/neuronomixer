"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SanityAuthor {
  _id: string;
  name: string;
  email?: string;
  shortBio?: string;
  userId?: string;
}

export default function AuthorApplicationRow({
  author,
}: {
  author: SanityAuthor;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

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

  return (
    <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white">{author.name}</p>
        {author.email && (
          <p className="text-sm text-gray-400">{author.email}</p>
        )}
        {author.shortBio && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
            {author.shortBio}
          </p>
        )}
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
