"use client";

import { useState } from "react";
import { signIn } from "next-auth/react"; // still used for Google OAuth button
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

interface CardProps {
  role: "SUBSCRIBER" | "AUTHOR";
  title: string;
  subtitle: string;
  description: string;
  perks: string[];
  badge: string;
  badgeClass: string;
  iconBgClass: string;
  accentColor: string;
  googleBtnClass: string;
  submitBtnClass: string;
  borderClass: string;
  checkColor: string;
  icon: React.ReactNode;
}

function SignUpCard({
  role,
  title,
  subtitle,
  description,
  perks,
  badge,
  badgeClass,
  iconBgClass,
  googleBtnClass,
  submitBtnClass,
  borderClass,
  checkColor,
  icon,
}: CardProps) {
  const router = useRouter();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEmailSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    let captchaToken: string | undefined;
    if (executeRecaptcha) {
      captchaToken = await executeRecaptcha("signup").catch((err) => {
        console.error("[reCAPTCHA] executeRecaptcha failed:", err);
        return undefined;
      });
    } else {
      console.warn("[reCAPTCHA] executeRecaptcha not available — provider not mounted?");
    }

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role, captchaToken }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      setLoading(false);
      return;
    }

    setLoading(false);
    // Redirect to "check your inbox" page — sign-in is blocked until email is verified
    router.push(`/auth/verify-email?pending=1&email=${encodeURIComponent(email)}`);
  }

  return (
    <div
      className={`
        flex flex-col
        bg-[#060d18]/90 backdrop-blur-md
        border border-white/10 ${borderClass}
        rounded-2xl p-7
        shadow-[0_8px_40px_rgba(0,0,0,0.5)]
        transition-all duration-300
      `}
    >
      {/* Icon + badge */}
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${iconBgClass}`}>{icon}</div>
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-medium border ${badgeClass}`}
        >
          {badge}
        </span>
      </div>

      {/* Text */}
      <h2 className="text-xl font-bold text-white mb-1">{title}</h2>
      <p
        className="text-xs font-medium mb-3"
        style={{ color: "var(--color-secondary)" }}
      >
        {subtitle}
      </p>
      <p className="text-sm text-gray-400 mb-5 leading-relaxed">
        {description}
      </p>

      {/* Perks */}
      <ul className="space-y-2 mb-6">
        {perks.map((perk) => (
          <li
            key={perk}
            className="flex items-center gap-2 text-sm text-gray-300"
          >
            <svg
              className={`w-4 h-4 shrink-0 ${checkColor}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m4.5 12.75 6 6 9-13.5"
              />
            </svg>
            {perk}
          </li>
        ))}
      </ul>

      {/* Email form */}
      <form onSubmit={handleEmailSignUp} className="flex flex-col gap-2.5">
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-white/30 transition"
        />
        <input
          type="password"
          placeholder="Password (min 10 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-white/30 transition"
        />
        <input
          type="password"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-white/30 transition"
        />

        {error && <p className="text-red-400 text-xs text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className={`w-full px-4 py-2.5 font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${submitBtnClass}`}
        >
          {loading
            ? "Creating account…"
            : `Sign up as ${role === "AUTHOR" ? "Author" : "Subscriber"}`}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-3 bg-[#060d18] text-gray-500">
            or continue with
          </span>
        </div>
      </div>

      {/* Google button */}
      <button
        onClick={() => {
          document.cookie = `role_intent=${role}; path=/; max-age=300; SameSite=Lax`;
          signIn("google", {
            callbackUrl: `/auth/complete-signup?role=${role}`,
          });
        }}
        className={`flex items-center justify-center gap-2.5 w-full px-4 py-3 font-semibold rounded-xl transition-all duration-200 ${googleBtnClass}`}
      >
        <GoogleIcon />
        Continue with Google
      </button>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-8 pb-16">
      <div className="absolute inset-0 bg-[var(--background)]" />
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/20 via-transparent to-[var(--color-accent)]/10" />

      <div className="relative z-10 w-full max-w-3xl">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <h1 className="text-3xl font-bold text-white">
            Join{" "}
            <span className="inline-flex">
              {"NeuroNomixer".split("").map((char, i) => (
                <motion.span
                  key={i}
                  className="inline-block"
                  animate={{ opacity: [0, 1, 1, 0], y: [6, 0, 0, -6] }}
                  transition={{
                    duration: 3.5,
                    repeat: Infinity,
                    repeatDelay: 1.5,
                    delay: i * 0.07,
                    ease: "easeInOut",
                  }}
                >
                  {char}
                </motion.span>
              ))}
            </span>
          </h1>
          <p className="text-gray-400 text-center max-w-sm">
            Choose how you want to be part of the community.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <SignUpCard
            role="SUBSCRIBER"
            title="Read & Discover"
            subtitle="Join as a Subscriber"
            description="Get access to curated articles, follow your favourite authors, and build a personalised reading feed."
            perks={[
              "Personalised content feed",
              "Follow authors & categories",
              "Save articles for later",
              "VIP tier coming soon",
            ]}
            badge="Free"
            badgeClass="bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] border-[var(--color-secondary)]/20"
            iconBgClass="bg-[var(--color-secondary)]/10 text-[var(--color-secondary)]"
            accentColor="var(--color-secondary)"
            checkColor="text-[var(--color-secondary)]"
            googleBtnClass="bg-[var(--color-secondary)] hover:bg-[var(--color-secondary)]/80 text-white"
            submitBtnClass="bg-[var(--color-secondary)]/20 hover:bg-[var(--color-secondary)]/30 text-[var(--color-secondary)] border border-[var(--color-secondary)]/30"
            borderClass="hover:border-[var(--color-secondary)]/40"
            icon={
              <svg
                className="w-7 h-7"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
                />
              </svg>
            }
          />

          <SignUpCard
            role="AUTHOR"
            title="Write & Inspire"
            subtitle="Apply as an Author"
            description="Submit articles, share your expertise, and build an audience on NeuroNomixer. Applications are reviewed by our team."
            perks={[
              "Submit articles for review",
              "Dedicated author profile",
              "Track post performance",
              "Build your audience",
            ]}
            badge="Application required"
            badgeClass="bg-[var(--color-accent)]/10 text-[var(--color-accent)] border-[var(--color-accent)]/20"
            iconBgClass="bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
            accentColor="var(--color-accent)"
            checkColor="text-[var(--color-accent)]"
            googleBtnClass="bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/80 text-[#0f172a]"
            submitBtnClass="bg-[var(--color-accent)]/20 hover:bg-[var(--color-accent)]/30 text-[var(--color-accent)] border border-[var(--color-accent)]/30"
            borderClass="hover:border-[var(--color-accent)]/40"
            icon={
              <svg
                className="w-7 h-7"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.862 4.487 18.1 3.25a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                />
              </svg>
            }
          />
        </div>

        <p className="mt-8 text-sm text-gray-500 text-center">
          Already have an account?{" "}
          <Link
            href="/auth/sign-in"
            className="text-[var(--color-accent)]/80 hover:text-[var(--color-accent)] underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </section>
  );
}
