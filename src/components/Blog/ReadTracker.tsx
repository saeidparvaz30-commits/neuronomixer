"use client";

import { useEffect } from "react";

interface Props {
  postSlug: string;
  postTitle: string;
  categorySlug: string;
  authorName?: string;
}

export default function ReadTracker({ postSlug, postTitle, categorySlug, authorName }: Props) {
  useEffect(() => {
    fetch("/api/track-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postSlug, postTitle, categorySlug, authorName }),
    }).catch(() => {});
  }, [postSlug, postTitle, categorySlug, authorName]);

  return null;
}
