"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type SubmitPostFormType from "@/app/(en)/dashboard/author/submit/SubmitPostForm";

// ssr: false is only valid inside a Client Component.
// This thin wrapper lets the Server Component (page.tsx) pass initialData
// to SubmitPostForm without triggering a Tiptap hydration mismatch.
const SubmitPostForm = dynamic(
  () => import("@/app/(en)/dashboard/author/submit/SubmitPostForm"),
  { ssr: false }
);

export default function EditPostFormLoader(
  props: ComponentProps<typeof SubmitPostFormType>
) {
  return <SubmitPostForm {...props} />;
}
