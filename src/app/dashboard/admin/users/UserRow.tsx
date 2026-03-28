"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  role: "ADMIN" | "AUTHOR" | "SUBSCRIBER";
  vip: boolean;
  authorStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
  createdAt: Date;
}

const roleBadge: Record<string, string> = {
  ADMIN: "bg-purple-500/20 text-purple-300",
  AUTHOR: "bg-blue-500/20 text-blue-300",
  SUBSCRIBER: "bg-gray-500/20 text-gray-300",
};

export default function UserRow({ user }: { user: UserData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggleVip() {
    setLoading(true);
    try {
      const action = user.vip ? "remove-vip" : "grant-vip";
      await fetch(`/api/dashboard/admin/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <tr className="text-gray-300 hover:bg-white/5 transition-colors">
      <td className="px-4 py-3 font-medium text-white">
        {user.name ?? "—"}
      </td>
      <td className="px-4 py-3 text-gray-400 text-xs">{user.email ?? "—"}</td>
      <td className="px-4 py-3">
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge[user.role]}`}
        >
          {user.role}
        </span>
      </td>
      <td className="px-4 py-3">
        {user.vip ? (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300">
            VIP
          </span>
        ) : (
          <span className="text-gray-600 text-xs">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-gray-500 text-xs">
        {new Date(user.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={toggleVip}
          disabled={loading}
          className="text-xs px-3 py-1 rounded-lg border border-white/10 hover:border-[var(--color-accent)]/50 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          {loading ? "..." : user.vip ? "Remove VIP" : "Grant VIP"}
        </button>
      </td>
    </tr>
  );
}
