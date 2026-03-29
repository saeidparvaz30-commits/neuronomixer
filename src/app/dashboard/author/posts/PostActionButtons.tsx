"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PenLine, Trash2, Loader2, AlertTriangle } from "lucide-react";

interface Props {
  postId: string;
  status: string;
  editBasePath?: string;
}

export function PostActionButtons({ postId, status, editBasePath = "/dashboard/author/posts" }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const isApproved = status === "approved";
  const isDeletionRequested = status === "deletion_requested";

  async function handleDelete() {
    setLoading(true);
    try {
      if (isApproved) {
        await fetch("/api/dashboard/author/request-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId }),
        });
      } else {
        await fetch("/api/dashboard/author/delete-post", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId }),
        });
      }
      router.refresh();
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center justify-end gap-2">
        {isApproved && (
          <span className="flex items-center gap-1 text-[10px] text-amber-400">
            <AlertTriangle size={10} />
            Needs admin approval
          </span>
        )}
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
    );
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {!isDeletionRequested && (
        <Link
          href={`${editBasePath}/${postId}/edit`}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 rounded-lg transition-colors"
        >
          <PenLine size={11} />
          Edit
        </Link>
      )}
      {isDeletionRequested ? (
        <span className="text-xs text-amber-400 italic">Awaiting admin</span>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white/5 hover:bg-red-900/40 text-gray-400 hover:text-red-400 border border-white/10 hover:border-red-700/40 rounded-lg transition-colors"
        >
          <Trash2 size={11} />
          Delete
        </button>
      )}
    </div>
  );
}
