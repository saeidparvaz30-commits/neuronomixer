"use client";

import { useFlushPendingGuideCompletions } from "@/hooks/usePendingGuideCompletions";

export function FlushPendingCompletions() {
  useFlushPendingGuideCompletions();
  return null;
}
