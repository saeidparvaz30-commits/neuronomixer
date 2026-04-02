"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, UserCheck } from "lucide-react";
import { useSession } from "next-auth/react";

interface Props {
  authorId: string;
  isFollowing?: boolean;
  isLoggedIn?: boolean;
}

export default function AuthorFollowButton({ authorId, isFollowing: initialFollowing = false, isLoggedIn: isLoggedInProp }: Props) {
  const { data: session, status } = useSession();
  const isLoggedIn = status !== "loading" ? !!session?.user : (isLoggedInProp ?? false);
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!session?.user) return;
    fetch(`/api/dashboard/subscriber/follow?sanityId=${encodeURIComponent(authorId)}&type=author`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.following === "boolean") setFollowing(data.following);
      })
      .catch(() => {});
  }, [authorId, session?.user]);

  async function toggle() {
    if (!isLoggedIn) {
      router.push("/auth/sign-in");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/subscriber/follow", {
        method: following ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "author", sanityId: authorId }),
      });
      if (res.ok) setFollowing(!following);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`
        inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium
        transition-all duration-200 disabled:opacity-50
        ${following
          ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-400/30"
          : "bg-[var(--color-accent)] text-[#0f172a] hover:bg-[var(--color-accent)]/80"
        }
      `}
    >
      {following ? <UserCheck size={14} /> : <UserPlus size={14} />}
      {following ? "Following" : "Follow"}
    </button>
  );
}
