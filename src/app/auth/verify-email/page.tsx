"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle } from "lucide-react";

function VerifyContent() {
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified") === "1";

  return (
    <div className="text-center">
      {verified ? (
        <>
          <CheckCircle className="mx-auto mb-4 text-green-400" size={48} />
          <h1 className="text-2xl font-bold text-white mb-2">Email verified!</h1>
          <p className="text-gray-400 mb-6">Your email address has been confirmed.</p>
          <Link
            href="/auth/sign-in"
            className="px-6 py-2.5 bg-[var(--color-accent)] text-[#0f172a] font-semibold rounded-xl hover:bg-[var(--color-accent)]/80 transition"
          >
            Sign In
          </Link>
        </>
      ) : (
        <>
          <XCircle className="mx-auto mb-4 text-red-400" size={48} />
          <h1 className="text-2xl font-bold text-white mb-2">Verification failed</h1>
          <p className="text-gray-400 mb-6">The link is invalid or has expired.</p>
          <p className="text-sm text-gray-500">
            Sign in and we&apos;ll resend the verification email, or{" "}
            <Link href="/auth/sign-in" className="text-[var(--color-accent)] hover:underline">
              go to sign in
            </Link>
            .
          </p>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[var(--background)]" />
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/20 via-transparent to-[var(--color-accent)]/10" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-[#060d18]/90 backdrop-blur-md border border-[var(--color-accent)]/30 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.7)] p-10">
          <Suspense fallback={<p className="text-gray-400 text-center">Verifying…</p>}>
            <VerifyContent />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
