"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
      <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)] mb-3">
        Something went wrong
      </p>
      <h1 className="text-3xl font-bold text-white mb-3">Unexpected error</h1>
      <p className="text-gray-400 max-w-md mb-2">
        This page failed to load. It is usually temporary.
      </p>
      {error.digest && (
        <p className="text-xs text-gray-600 font-mono mb-6">Ref: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="px-5 py-2.5 rounded-xl bg-[var(--color-accent)] text-[#0a0e1a] text-sm font-semibold hover:opacity-90 transition"
      >
        Try again
      </button>
    </div>
  );
}
