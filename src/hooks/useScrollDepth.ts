"use client";

import { useState, useEffect, type RefObject } from "react";

export function useScrollDepth(
  ref: RefObject<HTMLElement | null>,
  threshold: number
): boolean {
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const el = ref.current;
    if (!el) return;

    let rafId: number | null = null;

    const check = () => {
      if (passed) return;
      const rect = el.getBoundingClientRect();
      const viewed = Math.min(
        el.offsetHeight,
        Math.max(0, -rect.top + window.innerHeight)
      );
      const ratio = viewed / el.offsetHeight;
      if (ratio >= threshold) {
        setPassed(true);
      }
    };

    const onScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        check();
        rafId = null;
      });
    };

    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [ref, threshold, passed]);

  return passed;
}
