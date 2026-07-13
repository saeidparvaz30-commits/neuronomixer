"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setStatus("loading");

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setStatus("idle");
      return;
    }

    setStatus("done");
    setTimeout(() => router.push("/auth/sign-in"), 2000);
  }

  if (!token) {
    return (
      <p className="text-red-400 text-center">
        Invalid reset link.{" "}
        <Link href="/auth/forgot-password" className="underline text-[var(--color-accent)]">
          Request a new one
        </Link>
        .
      </p>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-white mb-2 text-center">Reset Password</h1>
      <p className="text-sm text-gray-400 text-center mb-8">Enter your new password below.</p>

      {status === "done" ? (
        <p className="text-green-400 text-center font-medium">
          Password updated! Redirecting to sign in…
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="New password (min 10 characters)"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-white/30 transition"
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            placeholder="Confirm new password"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-white/30 transition"
          />
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full py-2.5 bg-[var(--color-accent)] text-[#0f172a] font-semibold rounded-xl hover:bg-[var(--color-accent)]/80 transition disabled:opacity-50"
          >
            {status === "loading" ? "Saving…" : "Set New Password"}
          </button>
        </form>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[var(--background)]" />
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/20 via-transparent to-[var(--color-accent)]/10" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-[#060d18]/90 backdrop-blur-md border border-[var(--color-accent)]/30 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.7)] p-8">
          <Suspense fallback={<p className="text-gray-400 text-center">Loading…</p>}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
