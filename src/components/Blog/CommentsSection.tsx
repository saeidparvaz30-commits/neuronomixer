"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Send, Trash2, MessageSquare } from "lucide-react";
import { useSession } from "next-auth/react";

interface CommentUser {
  name: string | null;
  image: string | null;
  role: "ADMIN" | "AUTHOR" | "SUBSCRIBER";
}

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  userId: string;
  user: CommentUser;
}

interface Props {
  postSlug: string;
}

export default function CommentsSection({ postSlug }: Props) {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;
  const currentUserId = session?.user?.id;
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  const fetchComments = useCallback(async () => {
    const res = await fetch(`/api/posts/comments?postSlug=${encodeURIComponent(postSlug)}`);
    if (res.ok) setComments(await res.json());
    setFetching(false);
  }, [postSlug]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/posts/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postSlug, body }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setComments((prev) => [...prev, data]);
        setBody("");
      } else {
        setError(data?.error ?? "Failed to post comment.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function deleteComment(id: string) {
    const res = await fetch("/api/posts/comments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId: id }),
    });
    if (res.ok) setComments((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="mt-10 pt-8 border-t border-gray-200">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-6">
        <MessageSquare size={18} />
        Comments
        {comments.length > 0 && (
          <span className="text-sm font-normal text-gray-400">({comments.length})</span>
        )}
      </h3>

      {/* Comment form */}
      {isLoggedIn ? (
        <form onSubmit={submit} className="mb-8">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Share your thoughts..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 focus:border-[var(--color-primary)]/60"
          />
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={loading || !body.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/80 transition-colors disabled:opacity-50"
            >
              <Send size={13} />
              {loading ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-gray-400 mb-8">
          <Link href="/auth/sign-in" className="text-[var(--color-primary)] hover:underline">Sign in</Link> to leave a comment.
        </p>
      )}

      {/* Comments list */}
      {fetching ? (
        <p className="text-sm text-gray-400">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-400">No comments yet. Be the first!</p>
      ) : (
        <div className="flex flex-col gap-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              {c.user.image ? (
                <Image
                  src={c.user.image}
                  alt={c.user.name ?? "User"}
                  width={36}
                  height={36}
                  className="rounded-full object-cover shrink-0 w-9 h-9"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-semibold shrink-0">
                  {c.user.name?.[0]?.toUpperCase() ?? "U"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">
                      {c.user.name?.split(" ")[0] ?? "Anonymous"}
                    </span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      c.user.role === "ADMIN"
                        ? "bg-red-100 text-red-600"
                        : c.user.role === "AUTHOR"
                        ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                        : "bg-blue-50 text-blue-500"
                    }`}>
                      {c.user.role === "ADMIN" ? "Admin" : c.user.role === "AUTHOR" ? "Author" : "Subscriber"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-400">
                      {new Date(c.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    {(c.userId === currentUserId || isAdmin) && (
                      <button
                        onClick={() => deleteComment(c.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors"
                        title="Delete comment"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap break-words leading-relaxed">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
