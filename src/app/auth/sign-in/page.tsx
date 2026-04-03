"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";

export default function SignInPage() {
  const router = useRouter();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    let captchaToken: string | undefined;
    if (executeRecaptcha) {
      captchaToken = await executeRecaptcha("signin").catch(() => undefined);
    }

    const result = await signIn("credentials", {
      email,
      password,
      captchaToken,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password.");
    } else {
      const session = await getSession();
      const role = (session?.user as any)?.role;
      const onboarded = (session?.user as any)?.onboarded;
      if (!onboarded) {
        router.push("/auth/complete-signup");
      } else if (role === "ADMIN") {
        router.push("/dashboard/admin");
      } else if (role === "AUTHOR") {
        router.push("/dashboard/author");
      } else {
        router.push("/dashboard/subscriber");
      }
    }
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center -mt-24">
      {/* Background */}
      <div className="absolute inset-0 bg-[var(--background)]" />
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/20 via-transparent to-[var(--color-accent)]/10" />

      {/* Card */}
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
          {/* Logo */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <Image
              src="/pictures/Logo.png"
              alt="NeuroNomixer"
              width={60}
              height={60}
              className="rounded-full"
            />
            <h1 className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="text-sm text-gray-400 text-center">
              Sign in to access your dashboard and personalized content.
            </p>
          </div>

          {/* Credentials form */}
          <form onSubmit={handleCredentials} className="flex flex-col gap-3">
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
              placeholder="Password"
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

            <div className="flex justify-end -mt-1">
              <a href="/auth/forgot-password" className="text-xs text-gray-500 hover:text-[var(--color-accent)] transition-colors">
                Forgot password?
              </a>
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="
                w-full px-4 py-3 mt-1
                bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/80
                text-white font-medium rounded-xl
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-[#060d18] text-gray-500">
                or continue with
              </span>
            </div>
          </div>

          {/* Google OAuth */}
          <button
            onClick={() =>
              signIn("google", { callbackUrl: "/dashboard" })
            }
            className="
              flex items-center justify-center gap-3
              w-full px-4 py-3
              bg-white text-gray-900
              font-medium rounded-xl
              hover:bg-gray-100
              transition-all duration-200
              shadow-md
            "
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
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
            Continue with Google
          </button>

          <p className="mt-6 text-xs text-gray-500 text-center">
            By signing in, you agree to our{" "}
            <a href="/privacy" className="underline hover:text-gray-300">
              Privacy Policy
            </a>
            . New users will be asked to complete their profile.
          </p>

          <p className="mt-3 text-xs text-gray-500 text-center">
            New here?{" "}
            <a
              href="/auth/sign-up"
              className="text-[var(--color-accent)]/80 hover:text-[var(--color-accent)] underline"
            >
              Create an account
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
