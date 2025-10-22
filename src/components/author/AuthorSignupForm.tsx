"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export default function AuthorSignupForm() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/join-authors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      setStatus("success");
      setForm({ name: "", email: "", message: "" });
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-black border border-[var(--color-accent)] rounded-2xl p-8 shadow-md mt-20">
      <h2 className="text-3xl font-semibold mb-4 text-center text-[var(--color-accent)]">
        Become a Contributor
      </h2>
      <p className="text-center text-[var(--color-text-muted)] mb-8">
        Are you passionate about AI, finance, and analytics? Join the
        NeuroNomixer author community — we’d love to hear from you.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
        <input
          type="text"
          name="name"
          placeholder="Your Name"
          value={form.name}
          onChange={handleChange}
          required
          className="rounded-xl border border-[var(--color-accent)] bg-transparent px-4 py-2 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        />
        <input
          type="email"
          name="email"
          placeholder="Your Email"
          value={form.email}
          onChange={handleChange}
          required
          className="rounded-xl border border-[var(--color-accent)] bg-transparent px-4 py-2 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        />
        <textarea
          name="message"
          placeholder="Tell us briefly about your background or topics you'd like to cover..."
          rows={4}
          value={form.message}
          onChange={handleChange}
          className="rounded-xl border border-[var(--color-accent)] bg-transparent px-4 py-2 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="flex justify-center items-center space-x-2 bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-white font-semibold py-2 px-6 rounded-xl transition duration-200"
        >
          <Send size={18} />
          <span>{status === "loading" ? "Sending..." : "Send Request"}</span>
        </button>

        {status === "success" && (
          <p className="text-green-500 text-center mt-4">
            ✅ Thank you! We’ll get back to you soon.
          </p>
        )}
        {status === "error" && (
          <p className="text-red-500 text-center mt-4">
            ❌ {errorMsg || "Something went wrong. Please try again."}
          </p>
        )}
      </form>
    </div>
  );
}
