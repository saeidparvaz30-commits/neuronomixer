"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, EyeOff, Eye, Star, X } from "lucide-react";

interface Props {
  postId: string;
  title: string;
  authorName: string;
  publishedAt: string | null;
  updatedAt: string;
  category: string;
  hidden: boolean;
  featured: boolean;
  heroOrder: number | null;
}

export default function PublishedPostRow({
  postId, title, authorName, publishedAt, updatedAt, category, hidden, featured, heroOrder,
}: Props) {
  const router = useRouter();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [hideLoading, setHideLoading] = useState(false);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [heroLoading, setHeroLoading] = useState(false);

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      await fetch("/api/dashboard/admin/delete-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      router.refresh();
    } finally {
      setDeleteLoading(false);
      setConfirmingDelete(false);
    }
  }

  async function toggleHide() {
    setHideLoading(true);
    try {
      const action = hidden ? "unhide-post" : "hide-post";
      await fetch(`/api/dashboard/admin/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      router.refresh();
    } finally {
      setHideLoading(false);
    }
  }

  async function toggleFeatured() {
    setFeaturedLoading(true);
    try {
      await fetch("/api/dashboard/admin/toggle-featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, featured: !featured }),
      });
      router.refresh();
    } finally {
      setFeaturedLoading(false);
    }
  }

  async function setHeroOrder(slot: number | null) {
    setHeroLoading(true);
    try {
      await fetch("/api/dashboard/admin/set-hero-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, heroOrder: slot }),
      });
      router.refresh();
    } finally {
      setHeroLoading(false);
    }
  }

  const fmt = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "—";

  return (
    <tr className={`hover:bg-white/5 transition-colors text-sm ${hidden ? "opacity-50" : ""}`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span title={title} className={`font-medium line-clamp-1 cursor-default ${hidden ? "text-gray-400" : "text-white"}`}>{title}</span>
          {hidden && (
            <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-500/20 text-gray-400 border border-gray-500/20">
              Hidden
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-gray-400 text-xs">{authorName}</td>
      <td className="px-4 py-3 text-gray-400 text-xs">{category}</td>
      <td className="px-4 py-3 text-gray-500 text-xs">{fmt(publishedAt)}</td>
      <td className="px-4 py-3 text-gray-500 text-xs">{fmt(updatedAt)}</td>

      {/* Blog Featured */}
      <td className="px-4 py-3 text-center">
        <button
          onClick={toggleFeatured}
          disabled={featuredLoading}
          title={featured ? "Unfeature post" : "Feature on blog"}
          className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors disabled:opacity-50 ${
            featured
              ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/25"
              : "bg-white/5 text-gray-500 hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)]"
          }`}
        >
          {featuredLoading
            ? <Loader2 size={13} className="animate-spin" />
            : <Star size={13} fill={featured ? "currentColor" : "none"} />
          }
        </button>
      </td>

      {/* Hero Featured — slot buttons 1 / 2 / 3 + clear */}
      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-1">
          {heroLoading ? (
            <Loader2 size={13} className="animate-spin text-gray-500" />
          ) : (
            <>
              {([1, 2, 3] as const).map((slot) => (
                <button
                  key={slot}
                  onClick={() => setHeroOrder(heroOrder === slot ? null : slot)}
                  title={heroOrder === slot ? `Remove from hero slot ${slot}` : `Set hero slot ${slot}`}
                  className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold transition-colors ${
                    heroOrder === slot
                      ? "bg-[var(--color-accent)] text-[#0a0e1a]"
                      : "bg-white/5 text-gray-500 hover:bg-[var(--color-accent)]/20 hover:text-[var(--color-accent)]"
                  }`}
                >
                  {slot}
                </button>
              ))}
              {heroOrder != null && (
                <button
                  onClick={() => setHeroOrder(null)}
                  title="Remove from hero slideshow"
                  className="inline-flex items-center justify-center w-6 h-6 rounded text-xs transition-colors bg-white/5 text-gray-500 hover:bg-red-900/30 hover:text-red-400"
                >
                  <X size={10} />
                </button>
              )}
            </>
          )}
        </div>
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          {/* Hide / Show toggle */}
          <button
            onClick={toggleHide}
            disabled={hideLoading}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors disabled:opacity-50 ${
              hidden
                ? "bg-white/5 hover:bg-green-900/30 text-gray-400 hover:text-green-400 border-white/10 hover:border-green-700/40"
                : "bg-white/5 hover:bg-orange-900/30 text-gray-400 hover:text-orange-400 border-white/10 hover:border-orange-700/40"
            }`}
          >
            {hideLoading
              ? <Loader2 size={11} className="animate-spin" />
              : hidden
              ? <><Eye size={11} /> Show</>
              : <><EyeOff size={11} /> Hide</>
            }
          </button>

          {/* Delete */}
          {confirmingDelete ? (
            <>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {deleteLoading ? <Loader2 size={11} className="animate-spin" /> : "Confirm"}
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                className="px-2.5 py-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white/5 hover:bg-red-900/40 text-gray-400 hover:text-red-400 border border-white/10 hover:border-red-700/40 rounded-lg transition-colors"
            >
              <Trash2 size={11} />
              Delete
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
