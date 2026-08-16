"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStatus("loading");

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong.");
      setStatus("idle");
      return;
    }

    setStatus("done");
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[var(--background)]" />
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/20 via-transparent to-[var(--color-accent)]/10" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-[#060d18]/90 backdrop-blur-md border border-[var(--color-accent)]/30 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.7)] p-8">
          <h1 className="text-2xl font-bold text-white mb-2 text-center">Forgot Password</h1>
          <p className="text-sm text-gray-400 text-center mb-8">
            Enter your email and we&apos;ll send a reset link.
          </p>

          {status === "done" ? (
            <div className="text-center">
              <p className="text-green-400 font-medium mb-4">
                If an account exists for that email, a reset link has been sent.
              </p>
              <Link href="/auth/sign-in" className="text-sm text-[var(--color-accent)] hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Your email address"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-white/30 transition"
              />
              {error && <p className="text-red-400 text-xs text-center">{error}</p>}
              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full py-2.5 bg-[var(--color-accent)] text-[#0f172a] font-semibold rounded-xl hover:bg-[var(--color-accent)]/80 transition disabled:opacity-50"
              >
                {status === "loading" ? "Sending…" : "Send Reset Link"}
              </button>
              <p className="text-center text-sm text-gray-500">
                <Link href="/auth/sign-in" className="text-[var(--color-accent)]/80 hover:text-[var(--color-accent)] underline">
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
