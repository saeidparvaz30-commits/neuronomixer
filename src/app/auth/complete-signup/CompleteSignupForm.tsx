"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

interface Props {
  userEmail: string;
  userName: string;
}

export default function CompleteSignupForm({ userEmail, userName }: Props) {
  const router = useRouter();
  const { update } = useSession();
  const params = useSearchParams();
  const initialRole =
    params.get("role") === "AUTHOR" ? "AUTHOR" : "SUBSCRIBER";
  const [role, setRole] = useState<"SUBSCRIBER" | "AUTHOR">(initialRole);
  const [name, setName] = useState(userName);
  const [bio, setBio] = useState("");
  const [motivation, setMotivation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/complete-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, name, bio, motivation }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      // Force JWT refresh so middleware sees onboarded: true
      await update();
      router.push("/blog");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Email (read-only) */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Email</label>
        <input
          type="email"
          value={userEmail}
          disabled
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-gray-400 text-sm cursor-not-allowed"
        />
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm text-gray-300 mb-1">
          Full Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Your full name"
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/60"
        />
      </div>

      {/* Role selector */}
      <div>
        <label className="block text-sm text-gray-300 mb-2">
          I want to... <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              {
                value: "SUBSCRIBER",
                label: "Follow Content",
                desc: "Read posts, follow authors & categories",
              },
              {
                value: "AUTHOR",
                label: "Write Articles",
                desc: "Submit posts for review and publication",
              },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRole(opt.value)}
              className={`
                text-left p-3 rounded-xl border transition-all duration-200
                ${
                  role === opt.value
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-white"
                    : "border-white/10 bg-white/5 text-gray-400 hover:border-white/30"
                }
              `}
            >
              <p className="font-medium text-sm">{opt.label}</p>
              <p className="text-xs mt-0.5 opacity-70">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm text-gray-300 mb-1">
          Short Bio{role === "AUTHOR" && <span className="text-red-400"> *</span>}
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          required={role === "AUTHOR"}
          rows={3}
          placeholder={
            role === "AUTHOR"
              ? "Tell readers about yourself and your expertise..."
              : "Optional — a short intro about yourself"
          }
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/60"
        />
      </div>

      {/* Motivation — authors only */}
      {role === "AUTHOR" && (
        <div>
          <label className="block text-sm text-gray-300 mb-1">
            Why do you want to write for NeuroNomixer?{" "}
            <span className="text-red-400">*</span>
          </label>
          <textarea
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            required
            rows={3}
            placeholder="Share your motivation and what topics you'd like to cover..."
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/60"
          />
          <p className="mt-1 text-xs text-gray-500">
            Your application will be reviewed by an admin before you can publish.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="
          w-full py-3 px-6
          bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)]
          text-white font-semibold rounded-xl
          hover:opacity-90 transition-opacity
          disabled:opacity-50
        "
      >
        {loading ? "Saving..." : "Get Started"}
      </button>
    </form>
  );
}
