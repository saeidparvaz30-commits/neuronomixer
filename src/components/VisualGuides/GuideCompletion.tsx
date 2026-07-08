"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import GuideCelebration from "./GuideCelebration";
import { GuideCompletionSignupPrompt } from "@/components/prompts/GuideCompletionSignupPrompt";

interface Props {
  isComplete: boolean;
  guideSlug: string;
  score: number;
}

export default function GuideCompletion({ isComplete, guideSlug, score }: Props) {
  const { data: session, status } = useSession();
  const fired = useRef(false);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);

  useEffect(() => {
    if (!isComplete || fired.current || status === "loading") return;
    fired.current = true;

    if (session?.user) {
      // Authenticated: credit completion server-side (fire and forget)
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug, score }),
      }).catch(() => {});
    } else {
      // Anonymous: show signup prompt (pending completion recorded inside it)
      setShowSignupPrompt(true);
    }
  }, [isComplete, session?.user, status, guideSlug, score]);

  return (
    <>
      <div aria-live="polite" className="sr-only">
        {isComplete
          ? session?.user
            ? "Guide complete. Your progress has been saved."
            : "Guide complete. Sign up to save your progress."
          : null}
      </div>
      <GuideCelebration show={isComplete} saved={!!session?.user} />
      <GuideCompletionSignupPrompt
        guideSlug={guideSlug}
        open={showSignupPrompt}
        onClose={() => setShowSignupPrompt(false)}
      />
    </>
  );
}
