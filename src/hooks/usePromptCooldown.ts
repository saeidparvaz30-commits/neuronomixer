"use client";

import { useState, useEffect, useCallback } from "react";
import { COOLDOWN_DAYS } from "@/lib/prompts/constants";
import type { PromptId } from "@/lib/prompts/constants";

function storageKey(promptId: PromptId, suffix: string) {
  return `neuronomixer:prompt:${promptId}:${suffix}`;
}

export function usePromptCooldown(promptId: PromptId): {
  isOnCooldown: boolean;
  markDismissed: () => void;
  markShown: () => void;
} {
  const [isOnCooldown, setIsOnCooldown] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(storageKey(promptId, "dismissedAt"));
    if (!raw) {
      setIsOnCooldown(false);
      return;
    }
    const dismissedAt = new Date(raw).getTime();
    const cutoff = Date.now() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    setIsOnCooldown(dismissedAt > cutoff);
  }, [promptId]);

  const markDismissed = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(storageKey(promptId, "dismissedAt"), new Date().toISOString());
    setIsOnCooldown(true);
  }, [promptId]);

  const markShown = useCallback(() => {
    if (typeof window === "undefined") return;
    const key = storageKey(promptId, "shownCount");
    const current = parseInt(localStorage.getItem(key) ?? "0", 10);
    localStorage.setItem(key, String(current + 1));
  }, [promptId]);

  return { isOnCooldown, markDismissed, markShown };
}
