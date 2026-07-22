"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * SPEC v3 §15 utility: observe an element's content-box size.
 * SSR-safe (returns 0x0 until mounted). Prefer pure CSS/viewBox scaling;
 * reach for this only when a panel must switch layout logic by width.
 */
export function useElementSize<T extends HTMLElement>(): [
  RefObject<T | null>,
  { width: number; height: number },
] {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const box = entry.contentBoxSize?.[0];
      if (box) {
        setSize({ width: box.inlineSize, height: box.blockSize });
      } else {
        const rect = entry.contentRect;
        setSize({ width: rect.width, height: rect.height });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}
