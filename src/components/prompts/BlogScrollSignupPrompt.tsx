"use client";

import { useState, useRef, useEffect, type RefObject } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { PROMPT_IDS, BLOG_SCROLL_THRESHOLD } from "@/lib/prompts/constants";
import { usePromptCooldown } from "@/hooks/usePromptCooldown";
import { useScrollDepth } from "@/hooks/useScrollDepth";
import { SignupPromptModal } from "./SignupPromptModal";

// --- Copy ---
const HEADLINE = "Enjoying this? There's more where it came from.";
const SUBHEAD =
  "Sign up free to save this post, follow the author, and unlock exclusive guides.";

type Props = {
  targetRef: RefObject<HTMLElement | null>;
  authorName?: string;
};

export function BlogScrollSignupPrompt({ targetRef, authorName = "the author" }: Props) {
  const pathname = usePathname();
  const { status } = useSession();
  const { isOnCooldown, markDismissed, markShown } = usePromptCooldown(PROMPT_IDS.BLOG_SCROLL);
  const passed = useScrollDepth(targetRef, BLOG_SCROLL_THRESHOLD);
  const [open, setOpen] = useState(false);
  const shownOnPath = useRef<string | null>(null);

  const isSignedIn = status === "authenticated";

  const benefits = [
    "Save this post and build your reading list",
    `Follow ${authorName} and get new work in your inbox`,
    "Free CV builder and exclusive subscriber guides",
  ];

  useEffect(() => {
    if (
      passed &&
      !isSignedIn &&
      !isOnCooldown &&
      shownOnPath.current !== pathname
    ) {
      shownOnPath.current = pathname;
      markShown();
      setOpen(true);
    }
  }, [passed, isSignedIn, isOnCooldown, pathname, markShown]);

  if (isSignedIn) return null;

  const handleDismiss = () => {
    markDismissed();
    setOpen(false);
  };

  return (
    <SignupPromptModal
      open={open}
      onDismiss={handleDismiss}
      promptId={PROMPT_IDS.BLOG_SCROLL}
      headline={HEADLINE}
      subhead={SUBHEAD}
      benefits={benefits}
      primaryCta={{
        label: "Sign up free",
        href: `/auth/sign-up?redirect=${encodeURIComponent(pathname)}`,
      }}
      secondaryCta={{
        label: "Log in",
        href: `/auth/sign-in?redirect=${encodeURIComponent(pathname)}`,
      }}
      tertiaryAction={{
        label: "Keep reading",
        onClick: handleDismiss,
      }}
      variant="corner"
      currentPath={pathname}
    />
  );
}
