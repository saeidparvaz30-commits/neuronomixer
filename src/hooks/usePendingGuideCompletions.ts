"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

const STORAGE_KEY = "neuronomixer:pending-guide-completions";

interface PendingEntry {
  slug: string;
  at: string;
}

export function recordPendingGuideCompletion(slug: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const existing: PendingEntry[] = raw ? JSON.parse(raw) : [];
    if (existing.some((e) => e.slug === slug)) return;
    existing.push({ slug, at: new Date().toISOString() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // localStorage unavailable or corrupt — silently no-op
  }
}

export function useFlushPendingGuideCompletions(): void {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const entries: PendingEntry[] = JSON.parse(raw);
      if (entries.length === 0) return;

      const slugs = entries.map((e) => e.slug);

      fetch("/api/guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs }),
      })
        .then((res) => {
          if (res.ok) {
            localStorage.removeItem(STORAGE_KEY);
          }
        })
        .catch(() => {
          // network error — try again next mount
        });
    } catch {
      // localStorage unavailable or corrupt — silently no-op
    }
  }, [status]);
}
