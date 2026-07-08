"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion, motion, AnimatePresence } from "framer-motion";
import type { TargetAndTransition } from "framer-motion";
import { Check, X } from "lucide-react";
import type { PromptId } from "@/lib/prompts/constants";
import {
  emitPromptShown,
  emitPromptDismissed,
  emitPromptClickedSignup,
  emitPromptClickedLogin,
} from "@/lib/prompts/analytics";

export type SignupPromptModalProps = {
  open: boolean;
  onDismiss: (method: "x" | "esc" | "overlay") => void;
  promptId: PromptId;
  headline: string;
  subhead: string;
  benefits: string[];
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  tertiaryAction?: { label: string; onClick: () => void };
  variant?: "center" | "corner";
  disableOverlayDismiss?: boolean;
  currentPath: string;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function SignupPromptModal({
  open,
  onDismiss,
  promptId,
  headline,
  subhead,
  benefits,
  primaryCta,
  secondaryCta,
  tertiaryAction,
  variant = "center",
  disableOverlayDismiss = false,
  currentPath,
}: SignupPromptModalProps) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const headlineId = `prompt-headline-${promptId}`;
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Fire shown event once on open
  useEffect(() => {
    if (open) {
      emitPromptShown({ promptId, path: currentPath });
      triggerRef.current = document.activeElement;
    }
  }, [open, promptId, currentPath]);

  // Focus trap
  useEffect(() => {
    if (!open || !dialogRef.current) return;

    const el = dialogRef.current;
    const focusable = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusable.length > 0) focusable[0].focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onDismiss("esc");
        return;
      }
      if (e.key !== "Tab") return;
      if (focusable.length === 0) { e.preventDefault(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onDismiss]);

  // Return focus on close
  useEffect(() => {
    if (!open && triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [open]);

  const handleDismiss = useCallback(
    (method: "x" | "esc" | "overlay") => {
      emitPromptDismissed({ promptId, path: currentPath, method });
      onDismiss(method);
    },
    [promptId, currentPath, onDismiss]
  );

  const handleSignup = useCallback(() => {
    emitPromptClickedSignup({ promptId, path: currentPath });
    router.push(primaryCta.href);
  }, [promptId, currentPath, primaryCta.href, router]);

  const handleLogin = useCallback(() => {
    emitPromptClickedLogin({ promptId, path: currentPath });
    router.push(secondaryCta.href);
  }, [promptId, currentPath, secondaryCta.href, router]);

  // Animation states
  type AnimState = { initial: TargetAndTransition; animate: TargetAndTransition; exit: TargetAndTransition };
  const getAnim = (): AnimState => {
    if (shouldReduceMotion) {
      return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
    }
    if (isMobile) {
      return {
        initial: { y: "100%" },
        animate: { y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
        exit: { y: "100%", transition: { duration: 0.2, ease: "easeIn" as const } },
      };
    }
    if (variant === "corner") {
      return {
        initial: { x: "110%", opacity: 0 },
        animate: { x: 0, opacity: 1, transition: { duration: 0.25, ease: "easeOut" as const } },
        exit: { x: "110%", opacity: 0, transition: { duration: 0.2, ease: "easeIn" as const } },
      };
    }
    return {
      initial: { opacity: 0, y: 8 },
      animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" as const } },
      exit: { opacity: 0, y: 8, transition: { duration: 0.15 } },
    };
  };
  const anim = getAnim();

  const isCenter = variant === "center";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay — center variant only, suppressed when disableOverlayDismiss */}
          {isCenter && !disableOverlayDismiss && (
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60"
              onClick={() => handleDismiss("overlay")}
              aria-hidden="true"
            />
          )}

          {/* Dialog card */}
          <motion.div
            key="dialog"
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={headlineId}
            initial={anim.initial}
            animate={anim.animate}
            exit={anim.exit}
            className={[
              "fixed z-50 bg-[var(--color-surface)] text-[var(--color-text)] shadow-2xl",
              isCenter && !isMobile
                ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[440px] rounded-2xl"
                : "",
              isCenter && isMobile
                ? "bottom-0 left-0 right-0 rounded-t-2xl max-h-[90dvh] overflow-y-auto"
                : "",
              !isCenter && !isMobile
                ? "bottom-6 right-6 w-full max-w-[360px] rounded-2xl"
                : "",
              !isCenter && isMobile
                ? "bottom-0 left-0 right-0 rounded-t-2xl max-h-[90dvh] overflow-y-auto"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {/* Mobile drag handle */}
            {isMobile && (
              <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
                <div className="h-1 w-10 rounded-full bg-[var(--color-text-muted)] opacity-40" />
              </div>
            )}

            <div className="p-6">
              {/* Close button */}
              <button
                onClick={() => handleDismiss("x")}
                aria-label="Close"
                className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>

              {/* Headline */}
              <h2
                id={headlineId}
                className="text-lg font-semibold text-[var(--color-text)] pr-8 mb-1"
              >
                {headline}
              </h2>

              {/* Subhead */}
              <p className="text-sm text-[var(--color-text-muted)] mb-4">{subhead}</p>

              {/* Benefits */}
              <ul className="space-y-2 mb-6">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2 text-sm text-[var(--color-text)]">
                    <Check
                      size={16}
                      className="mt-0.5 shrink-0 text-[var(--color-secondary)]"
                      aria-hidden="true"
                    />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>

              {/* CTAs */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleSignup}
                  className="w-full rounded-xl bg-[var(--color-primary)] hover:opacity-90 text-white font-medium py-2.5 px-4 text-sm transition-opacity"
                >
                  {primaryCta.label}
                </button>
                <button
                  onClick={handleLogin}
                  className="w-full rounded-xl border border-white/15 hover:bg-white/5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] font-medium py-2.5 px-4 text-sm transition-colors"
                >
                  {secondaryCta.label}
                </button>
              </div>

              {/* Tertiary action */}
              {tertiaryAction && (
                <div className="mt-3 text-center">
                  <button
                    onClick={tertiaryAction.onClick}
                    className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] underline underline-offset-2 transition-colors"
                  >
                    {tertiaryAction.label}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
