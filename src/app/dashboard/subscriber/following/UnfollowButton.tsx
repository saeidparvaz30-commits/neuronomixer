"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UnfollowButton({
  type,
  sanityId,
}: {
  type: string;
  sanityId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleUnfollow() {
    setLoading(true);
    await fetch("/api/dashboard/subscriber/follow", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, sanityId }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleUnfollow}
      disabled={loading}
      className="px-3 py-1.5 text-xs rounded-lg
                 border border-red-500/30 text-red-400
                 hover:bg-red-500/10 transition-colors
                 disabled:opacity-50 shrink-0"
    >
      {loading ? "…" : "Unfollow"}
    </button>
  );
}
