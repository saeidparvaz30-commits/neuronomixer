"use client";

import Link from "next/link";
import { PenLine } from "lucide-react";

export default function AuthorSignupForm() {
  return (
    <div className="max-w-3xl mx-auto bg-black border border-[var(--color-accent)] rounded-2xl p-10 shadow-md mt-20 text-center">
      <h2 className="text-3xl font-semibold mb-4 text-[var(--color-accent)]">
        Become a Contributor
      </h2>
      <p className="text-[var(--color-text-muted)] mb-8 max-w-xl mx-auto leading-relaxed">
        Are you passionate about AI, finance, and analytics? Join the NeuroNomixer
        author community — create an account, apply as an author, and start sharing
        your insights with our readers.
      </p>
      <Link
        href="/auth/sign-up"
        className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-[var(--color-accent)] text-[#0a0e1a] text-[15px] font-semibold hover:opacity-90 transition"
      >
        <PenLine size={18} />
        Sign Up as Author
      </Link>
    </div>
  );
}
