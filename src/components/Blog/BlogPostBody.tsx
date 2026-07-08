"use client";

import { useRef, type ReactNode } from "react";
import { BlogScrollSignupPrompt } from "@/components/prompts/BlogScrollSignupPrompt";

type Props = {
  children: ReactNode;
  authorName?: string;
};

export function BlogPostBody({ children, authorName }: Props) {
  const articleRef = useRef<HTMLElement>(null);

  return (
    <>
      <article
        ref={articleRef}
        className="prose prose-sm sm:prose-base lg:prose-lg max-w-none w-full mt-8 text-left text-gray-900"
      >
        {children}
      </article>
      <BlogScrollSignupPrompt targetRef={articleRef} authorName={authorName} />
    </>
  );
}
