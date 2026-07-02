"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { PROMPT_IDS } from "@/lib/prompts/constants";
import { recordPendingGuideCompletion } from "@/hooks/usePendingGuideCompletions";
import { SignupPromptModal } from "./SignupPromptModal";

// --- Copy ---
const HEADLINE = "Nice, you finished the guide!";
const SUBHEAD = "Sign up free to save your progress and unlock what's coming next.";
const BENEFITS = [
  "Save your progress across every guide",
  "Get early access to new visual guides (subscriber-only releases coming soon)",
  "Build your free CV page (like neuronomixer.com/cv/saeid-sheikhi)",
  "Follow categories, save posts, and comment",
];

type Props = {
  guideSlug: string;
  open: boolean;
  onClose: () => void;
};

export function GuideCompletionSignupPrompt({ guideSlug, open, onClose }: Props) {
  const pathname = usePathname();
  const { status } = useSession();
  const recorded = useRef(false);

  // Record pending completion immediately on first open, regardless of signup
  useEffect(() => {
    if (open && !recorded.current) {
      recorded.current = true;
      recordPendingGuideCompletion(guideSlug);
    }
  }, [open, guideSlug]);

  // Authenticated users never see this — their completion is saved server-side
  if (status === "authenticated") return null;

  const signupHref = `/signup?redirect=${encodeURIComponent(pathname)}&guide=${encodeURIComponent(guideSlug)}`;
  const loginHref = `/login?redirect=${encodeURIComponent(pathname)}&guide=${encodeURIComponent(guideSlug)}`;

  return (
    <SignupPromptModal
      open={open}
      onDismiss={onClose}
      promptId={PROMPT_IDS.GUIDE_COMPLETION}
      headline={HEADLINE}
      subhead={SUBHEAD}
      benefits={BENEFITS}
      primaryCta={{ label: "Save my progress, sign up", href: signupHref }}
      secondaryCta={{ label: "Already a member? Log in", href: loginHref }}
      variant="center"
      disableOverlayDismiss={true}
      currentPath={pathname}
    />
  );
}
