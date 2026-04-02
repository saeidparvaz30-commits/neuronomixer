"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, X, Zap, RotateCcw } from "lucide-react";

interface Props {
  postId: string;
  title: string;
  authorName: string;
  category: string;
  publishedAt: string;
}

export default function ScheduledPostRow({ postId, title, authorName, category, publishedAt }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"post_now" | "send_back" | "reschedule" | null>(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState("");

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().slice(0, 16);

  async function handleAction(action: "post_now" | "send_back" | "reschedule") {
    setLoading(action);
    try {
      await fetch("/api/dashboard/admin/scheduled-post-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          action,
          ...(action === "reschedule" ? { scheduledAt: newDate } : {}),
        }),
      });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  const scheduledLabel = new Date(publishedAt).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });

  return (
    <>
      <tr className="hover:bg-white/[0.02] border-b border-white/5 last:border-0">
        <td className="px-4 py-3 text-white font-medium">{title}</td>
        <td className="px-4 py-3 text-gray-400">{authorName}</td>
        <td className="px-4 py-3 text-gray-400">{category}</td>
        <td className="px-4 py-3 text-blue-400 font-medium whitespace-nowrap">{scheduledLabel}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 justify-end flex-wrap">
            {/* Post Now */}
            <button
              onClick={() => handleAction("post_now")}
              disabled={!!loading}
              title="Publish immediately"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Zap size={12} />
              {loading === "post_now" ? "Publishing…" : "Post Now"}
            </button>

            {/* Send Back for Review */}
            <button
              onClick={() => handleAction("send_back")}
              disabled={!!loading}
              title="Move back to pending review"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-orange-600/80 hover:bg-orange-500 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RotateCcw size={12} />
              {loading === "send_back" ? "Sending…" : "Send for Review"}
            </button>

            {/* Reschedule toggle */}
            <button
              onClick={() => setShowReschedule((v) => !v)}
              disabled={!!loading}
              title="Change publish date"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 ${
                showReschedule
                  ? "bg-blue-600/30 text-blue-300 border border-blue-500/40"
                  : "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
              }`}
            >
              <Calendar size={12} />
              Reschedule
            </button>
          </div>
        </td>
      </tr>

      {/* Reschedule panel (spans full row) */}
      {showReschedule && (
        <tr className="bg-[#0a1628]">
          <td colSpan={5} className="px-4 py-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-gray-400">New publish date &amp; time:</span>
              <input
                type="datetime-local"
                value={newDate}
                min={minDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-white/15 bg-[#060d18] text-white text-sm focus:outline-none focus:border-[var(--color-accent)]/60"
              />
              <button
                onClick={() => handleAction("reschedule")}
                disabled={!newDate || !!loading}
                className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-40"
              >
                {loading === "reschedule" ? "Saving…" : "Save New Date"}
              </button>
              <button
                onClick={() => { setShowReschedule(false); setNewDate(""); }}
                className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
