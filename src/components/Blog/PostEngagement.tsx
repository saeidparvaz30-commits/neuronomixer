"use client";

import { useState, useEffect } from "react";
import { Heart, Bookmark, Share2, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface Props {
  postSlug: string;
  postTitle: string;
  categorySlug: string;
}

export default function PostEngagement({ postSlug, postTitle, categorySlug }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/posts/like?postSlug=${encodeURIComponent(postSlug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setLikeCount(data.count);
          setLiked(data.liked);
        }
      })
      .catch(() => {});

    fetch(`/api/posts/bookmark?postSlug=${encodeURIComponent(postSlug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setBookmarked(data.bookmarked);
      })
      .catch(() => {});
  }, [postSlug]);

  async function toggleLike() {
    if (!isLoggedIn) { router.push("/auth/sign-in"); return; }
    setLikeLoading(true);
    try {
      const res = await fetch("/api/posts/like", {
        method: liked ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postSlug }),
      });
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      if (data) {
        setLiked(data.liked);
        setLikeCount(data.count);
      }
    } catch {
      // silent
    } finally {
      setLikeLoading(false);
    }
  }

  async function toggleBookmark() {
    if (!isLoggedIn) { router.push("/auth/sign-in"); return; }
    setBookmarkLoading(true);
    try {
      const res = await fetch("/api/posts/bookmark", {
        method: bookmarked ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postSlug, postTitle, categorySlug }),
      });
      if (res.ok) setBookmarked(!bookmarked);
    } catch {
      // silent
    } finally {
      setBookmarkLoading(false);
    }
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: postTitle, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // user cancelled share
    }
  }

  return (
    <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-200">
      {/* Like */}
      <button
        onClick={toggleLike}
        disabled={likeLoading}
        title={isLoggedIn ? (liked ? "Unlike" : "Like") : "Sign in to like"}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50
          ${liked
            ? "bg-red-50 text-red-500 border border-red-200"
            : "bg-gray-100 text-gray-500 border border-gray-200 hover:bg-red-50 hover:text-red-400 hover:border-red-200"
          }`}
      >
        <Heart size={15} className={liked ? "fill-current" : ""} />
        <span>{likeCount > 0 ? likeCount : ""}</span>
      </button>

      {/* Bookmark */}
      <button
        onClick={toggleBookmark}
        disabled={bookmarkLoading}
        title={isLoggedIn ? (bookmarked ? "Remove bookmark" : "Bookmark") : "Sign in to bookmark"}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50
          ${bookmarked
            ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/30"
            : "bg-gray-100 text-gray-500 border border-gray-200 hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/30"
          }`}
      >
        <Bookmark size={15} className={bookmarked ? "fill-current" : ""} />
        {bookmarked ? "Saved" : "Save"}
      </button>

      {/* Share */}
      <button
        onClick={share}
        title="Share"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200 transition-all duration-200"
      >
        {copied ? <Check size={15} className="text-green-500" /> : <Share2 size={15} />}
        {copied ? "Copied!" : "Share"}
      </button>
    </div>
  );
}
