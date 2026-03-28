"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function SetupAdminPage() {
  const router = useRouter();
  const [setupSecret, setSetupSecret] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/setup-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, setupSecret }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Something went wrong.");
    } else {
      setDone(true);
      setTimeout(() => router.push("/auth/sign-in"), 2000);
    }
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center -mt-24">
      <div className="absolute inset-0 bg-[var(--background)]" />
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/20 via-transparent to-[var(--color-accent)]/10" />

      <div className="relative z-10 w-full max-w-md mx-4">
        <div
          className="
            bg-[#060d18]/90 backdrop-blur-md
            border border-[var(--color-accent)]/30
            rounded-2xl
            shadow-[0_8px_40px_rgba(0,0,0,0.7)]
            p-8 md:p-10
          "
        >
          <div className="flex flex-col items-center gap-3 mb-8">
            <Image
              src="/pictures/Logo.png"
              alt="NeuroNomixer"
              width={60}
              height={60}
              className="rounded-full"
            />
            <h1 className="text-2xl font-bold text-white">Admin Setup</h1>
            <p className="text-sm text-gray-400 text-center">
              Create the administrator account. Requires the setup secret from
              your server environment.
            </p>
          </div>

          {done ? (
            <div className="text-center text-green-400 font-medium py-4">
              Admin account created! Redirecting to sign in…
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="password"
                placeholder="Setup secret"
                value={setupSecret}
                onChange={(e) => setSetupSecret(e.target.value)}
                required
                className="
                  w-full px-4 py-3
                  bg-white/5 border border-[var(--color-accent)]/20
                  rounded-xl text-white placeholder-gray-500
                  focus:outline-none focus:border-[var(--color-accent)]/60
                  transition
                "
              />
              <div className="border-t border-white/10 my-1" />
              <input
                type="text"
                placeholder="Display name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="
                  w-full px-4 py-3
                  bg-white/5 border border-white/10
                  rounded-xl text-white placeholder-gray-500
                  focus:outline-none focus:border-[var(--color-accent)]/60
                  transition
                "
              />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="
                  w-full px-4 py-3
                  bg-white/5 border border-white/10
                  rounded-xl text-white placeholder-gray-500
                  focus:outline-none focus:border-[var(--color-accent)]/60
                  transition
                "
              />
              <input
                type="password"
                placeholder="Password (min 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="
                  w-full px-4 py-3
                  bg-white/5 border border-white/10
                  rounded-xl text-white placeholder-gray-500
                  focus:outline-none focus:border-[var(--color-accent)]/60
                  transition
                "
              />
              <input
                type="password"
                placeholder="Confirm password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="
                  w-full px-4 py-3
                  bg-white/5 border border-white/10
                  rounded-xl text-white placeholder-gray-500
                  focus:outline-none focus:border-[var(--color-accent)]/60
                  transition
                "
              />

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="
                  w-full px-4 py-3 mt-1
                  bg-[var(--color-accent)]/80 hover:bg-[var(--color-accent)]
                  text-[#0f172a] font-semibold rounded-xl
                  transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                {loading ? "Creating…" : "Create Admin Account"}
              </button>

              <p className="text-xs text-gray-600 text-center mt-2">
                Already have an account?{" "}
                <a
                  href="/auth/sign-in"
                  className="text-[var(--color-accent)]/70 hover:text-[var(--color-accent)] underline"
                >
                  Sign in
                </a>
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
