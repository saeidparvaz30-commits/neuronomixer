"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Mail, RefreshCw } from "lucide-react";

function ResendButton({ email }: { email: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleResend() {
    setStatus("sending");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 4000);
        return;
      }
      void data;
      setStatus("sent");
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    }
  }

  if (status === "sent") {
    return (
      <p className="text-sm text-green-400 flex items-center gap-1.5 justify-center">
        <CheckCircle size={14} /> Email resent — check your inbox.
      </p>
    );
  }

  return (
    <button
      onClick={handleResend}
      disabled={status === "sending"}
      className="flex items-center gap-2 mx-auto text-sm text-[var(--color-accent)] hover:text-[var(--color-accent)]/80 disabled:opacity-50 transition"
    >
      <RefreshCw size={14} className={status === "sending" ? "animate-spin" : ""} />
      {status === "sending" ? "Sending…" : status === "error" ? "Failed — try again" : "Resend verification email"}
    </button>
  );
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified") === "1";
  const pending = searchParams.get("pending") === "1";
  const email = searchParams.get("email") ?? "";

  if (pending) {
    return (
      <>
        <Mail className="mx-auto mb-4 text-[var(--color-accent)]" size={48} />
        <h1 className="text-2xl font-bold text-white mb-2">Check your inbox</h1>
        <p className="text-gray-400 mb-2">
          We sent a verification link to
        </p>
        {email && (
          <p className="text-white font-medium mb-4 text-sm break-all">{email}</p>
        )}
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
          Click the link in the email to activate your account. The link expires in 24 hours.
        </p>
        {email && <ResendButton email={email} />}
        <p className="mt-6 text-xs text-gray-600">
          Already verified?{" "}
          <Link href="/auth/sign-in" className="text-[var(--color-accent)]/80 hover:text-[var(--color-accent)] underline">
            Sign in
          </Link>
        </p>
      </>
    );
  }

  if (verified) {
    return (
      <>
        <CheckCircle className="mx-auto mb-4 text-green-400" size={48} />
        <h1 className="text-2xl font-bold text-white mb-2">Email verified!</h1>
        <p className="text-gray-400 mb-6">Your email address has been confirmed. You can now sign in.</p>
        <Link
          href="/auth/sign-in"
          className="px-6 py-2.5 bg-[var(--color-accent)] text-[#0f172a] font-semibold rounded-xl hover:bg-[var(--color-accent)]/80 transition"
        >
          Sign In
        </Link>
      </>
    );
  }

  // Expired / invalid token state
  return (
    <>
      <XCircle className="mx-auto mb-4 text-red-400" size={48} />
      <h1 className="text-2xl font-bold text-white mb-2">Verification failed</h1>
      <p className="text-gray-400 mb-4">The link is invalid or has expired.</p>
      <p className="text-sm text-gray-500 mb-6">
        Enter your email below to get a new link, or{" "}
        <Link href="/auth/sign-in" className="text-[var(--color-accent)] hover:underline">
          go to sign in
        </Link>
        .
      </p>
      <ResendFromForm />
    </>
  );
}

function ResendFromForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong.");
        setStatus("error");
        return;
      }
      void data;
      setStatus("sent");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p className="text-sm text-green-400 flex items-center gap-1.5 justify-center">
        <CheckCircle size={14} /> If that email has an unverified account, a new link is on its way.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-2">
      <input
        type="email"
        placeholder="Your email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-white/30 transition"
      />
      {errorMsg && <p className="text-red-400 text-xs text-center">{errorMsg}</p>}
      <button
        type="submit"
        disabled={status === "sending"}
        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/80 text-white font-medium rounded-xl transition disabled:opacity-50"
      >
        <RefreshCw size={14} className={status === "sending" ? "animate-spin" : ""} />
        {status === "sending" ? "Sending…" : "Resend verification email"}
      </button>
    </form>
  );
}

export default function VerifyEmailPage() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[var(--background)]" />
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/20 via-transparent to-[var(--color-accent)]/10" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-[#060d18]/90 backdrop-blur-md border border-[var(--color-accent)]/30 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.7)] p-10 text-center">
          <Suspense fallback={<p className="text-gray-400">Loading…</p>}>
            <VerifyContent />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
