import Link from "next/link";

export default function SuspendedPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Account Deactivated</h1>
        <p className="text-gray-400 mb-2">
          Your account has been deactivated by an administrator.
        </p>
        <p className="text-gray-500 text-sm mb-8">
          If you believe this is a mistake, please reach out to us using the contact form.
        </p>
        <Link
          href="/contact"
          className="inline-block px-6 py-3 bg-[var(--color-accent)] text-black font-semibold rounded-xl hover:opacity-90 transition-opacity"
        >
          Contact Us
        </Link>
      </div>
    </div>
  );
}
