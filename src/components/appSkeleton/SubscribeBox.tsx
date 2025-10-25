"use client";

import { useState } from "react";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";

export default function SubscribeBox() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { executeRecaptcha } = useGoogleReCaptcha();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    if (!executeRecaptcha) {
      setMessage("Captcha not ready, please try again.");
      setLoading(false);
      return;
    }

    try {
      // get token from Google
      const token = await executeRecaptcha("subscribe_form");
      console.log("📮 Sending token:", token);

      // send email and token to backend
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });

      const data = await res.json();
      setMessage(data.message);
      if (data.success) setEmail("");
    } catch (err) {
      console.error("Subscription error:", err);
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white text-black rounded-2xl shadow-lg p-8 mt-16 max-w-[1000px] mx-auto text-center">
      <h2 className="text-2xl font-bold mb-3">Stay in the loop!</h2>
      <p className="text-gray-600 mb-6">
        Subscribe to get updates on new posts, insights, and project highlights.
      </p>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row items-center justify-center gap-3"
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Your email address"
          className="w-full sm:w-auto flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-[var(--color-accent)] text-white font-semibold rounded-lg hover:bg-[var(--color-primary)] transition-all disabled:opacity-70"
        >
          {loading ? "Subscribing..." : "Subscribe"}
        </button>
      </form>

      {message && (
        <p
          className={`mt-4 text-sm font-medium ${
            message.toLowerCase().includes("success")
              ? "text-green-600"
              : "text-red-600"
          }`}
        >
          {message}
        </p>
      )}

      <p className="mt-4 text-xs text-gray-400">
        By subscribing, you agree to receive updates from NeuroNomixer. Your
        email will only be used for updates and will never be shared with third
        parties. You can unsubscribe anytime by sending us an email.
      </p>
    </div>
  );
}
