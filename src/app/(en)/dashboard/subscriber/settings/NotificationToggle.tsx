"use client";

import { useState } from "react";

export default function NotificationToggle({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const next = !on;
    const res = await fetch("/api/dashboard/subscriber/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailNotifications: next }),
    });
    if (res.ok) setOn(next);
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-pressed={on}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full
        transition-colors duration-200 focus:outline-none
        disabled:opacity-50
        ${on ? "bg-[var(--color-secondary)]" : "bg-white/20"}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 rounded-full bg-white shadow
          transform transition-transform duration-200
          ${on ? "translate-x-6" : "translate-x-1"}
        `}
      />
    </button>
  );
}
