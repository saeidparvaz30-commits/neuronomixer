"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export function useTimeOnPage(delayMs: number): boolean {
  const pathname = usePathname();
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    setElapsed(false);
    const timer = setTimeout(() => setElapsed(true), delayMs);
    return () => clearTimeout(timer);
  }, [pathname, delayMs]);

  return elapsed;
}
