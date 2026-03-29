"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const typeIcon: Record<string, string> = {
  author_approved: "✅",
  author_rejected: "❌",
  post_approved: "🎉",
  post_rejected: "📝",
};

export default function NotificationsPageContent() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  async function load() {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function markAllRead() {
    setMarkingAll(true);
    await fetch("/api/notifications/mark-read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setMarkingAll(false);
  }

  async function markOneRead(id: string) {
    await fetch("/api/notifications/mark-read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }

  const unread = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell size={20} className="text-[var(--color-accent)]" />
          <h2 className="text-lg font-semibold text-white">Notifications</h2>
          {unread > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--color-accent)]/20 text-[var(--color-accent)]">
              {unread} new
            </span>
          )}
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell size={40} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">No notifications yet.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`flex items-start gap-4 px-4 py-3.5 rounded-xl border transition-colors ${
                n.read
                  ? "bg-white/[0.02] border-white/5 text-gray-400"
                  : "bg-[var(--color-accent)]/5 border-[var(--color-accent)]/20 text-white"
              }`}
            >
              <span className="text-lg mt-0.5 shrink-0">{typeIcon[n.type] ?? "🔔"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug">{n.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(n.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {n.link && (
                  <Link
                    href={n.link}
                    onClick={() => !n.read && markOneRead(n.id)}
                    className="text-[var(--color-accent)] hover:text-[var(--color-accent)]/80 transition-colors"
                    title="Go to link"
                  >
                    <ExternalLink size={14} />
                  </Link>
                )}
                {!n.read && (
                  <button
                    onClick={() => markOneRead(n.id)}
                    className="w-2 h-2 rounded-full bg-[var(--color-accent)] shrink-0"
                    title="Mark as read"
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
