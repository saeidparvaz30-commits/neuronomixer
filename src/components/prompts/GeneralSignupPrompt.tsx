"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { isPathExcludedFromGeneralPrompt } from "@/lib/prompts/exclusions";
import { PROMPT_IDS, GENERAL_PROMPT_DELAY_MS } from "@/lib/prompts/constants";
import { usePromptCooldown } from "@/hooks/usePromptCooldown";
import { useTimeOnPage } from "@/hooks/useTimeOnPage";
import { SignupPromptModal } from "./SignupPromptModal";

// --- Copy ---
const HEADLINE = "Get more out of NeuroNomixer";
const SUBHEAD =
  "Join free and get exclusive guides, save what you read, and build your CV page in minutes.";
const BENEFITS = [
  "Exclusive guides and deep dives",
  "Free CV builder with a public page (like neuronomixer.com/cv/saeid-sheikhi)",
  "Follow categories and authors you care about",
  "Save posts and join the comments",
];
const PRIMARY_CTA_LABEL = "Sign up free";
const SECONDARY_CTA_LABEL = "Already a member? Log in";

export function GeneralSignupPrompt() {
  const pathname = usePathname();
  const { status } = useSession();
  const { isOnCooldown, markDismissed, markShown } = usePromptCooldown(PROMPT_IDS.GENERAL);
  const elapsed = useTimeOnPage(GENERAL_PROMPT_DELAY_MS);
  const [open, setOpen] = useState(false);
  const hasShownThisSession = useRef(false);

  const isExcluded = isPathExcludedFromGeneralPrompt(pathname);
  const isSignedIn = status === "authenticated";

  useEffect(() => {
    if (
      elapsed &&
      !isExcluded &&
      !isSignedIn &&
      !isOnCooldown &&
      !hasShownThisSession.current
    ) {
      hasShownThisSession.current = true;
      markShown();
      setOpen(true);
    }
  }, [elapsed, isExcluded, isSignedIn, isOnCooldown, markShown]);

  if (isExcluded || isSignedIn) return null;

  const handleDismiss = () => {
    markDismissed();
    setOpen(false);
  };

  return (
    <SignupPromptModal
      open={open}
      onDismiss={handleDismiss}
      promptId={PROMPT_IDS.GENERAL}
      headline={HEADLINE}
      subhead={SUBHEAD}
      benefits={BENEFITS}
      primaryCta={{
        label: PRIMARY_CTA_LABEL,
        href: `/auth/sign-up?redirect=${encodeURIComponent(pathname)}`,
      }}
      secondaryCta={{
        label: SECONDARY_CTA_LABEL,
        href: `/auth/sign-in?redirect=${encodeURIComponent(pathname)}`,
      }}
      variant="center"
      currentPath={pathname}
    />
  );
}
