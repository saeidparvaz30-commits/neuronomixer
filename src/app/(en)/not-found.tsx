import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
      <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)] mb-3">
        404
      </p>
      <h1 className="text-3xl font-bold text-white mb-3">Page not found</h1>
      <p className="text-gray-400 max-w-md mb-8">
        The page you are looking for does not exist or has moved.
      </p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl bg-[var(--color-accent)] text-[#0a0e1a] text-sm font-semibold hover:opacity-90 transition"
        >
          Back to home
        </Link>
        <Link
          href="/blog"
          className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-gray-300 hover:bg-white/10 transition"
        >
          Browse the blog
        </Link>
      </div>
    </div>
  );
}
