"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, ChevronDown } from "lucide-react";

interface Props {
  categoryId: string;
  title: string;
  description?: string;
  active: boolean;
  postCount: number;
}

export default function CategoryRow({ categoryId, title, description, active: initialActive, postCount }: Props) {
  const router = useRouter();
  const [active, setActive] = useState(initialActive);
  const [statusLoading, setStatusLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function toggleStatus(newActive: boolean) {
    if (newActive === active) return;
    setStatusLoading(true);
    try {
      await fetch("/api/dashboard/admin/toggle-category-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, active: newActive }),
      });
      setActive(newActive);
      router.refresh();
    } finally {
      setStatusLoading(false);
    }
  }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      await fetch("/api/dashboard/admin/delete-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId }),
      });
      router.refresh();
    } finally {
      setDeleteLoading(false);
      setConfirming(false);
    }
  }

  return (
    <tr className="hover:bg-white/5 transition-colors text-sm">
      <td className="px-4 py-3">
        <p className="text-white font-medium">{title}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{description}</p>}
      </td>
      <td className="px-4 py-3 text-gray-500 text-xs">{postCount}</td>

      {/* Status dropdown */}
      <td className="px-4 py-3">
        <div className="relative inline-block">
          <select
            value={active ? "active" : "hidden"}
            onChange={(e) => toggleStatus(e.target.value === "active")}
            disabled={statusLoading}
            className={`appearance-none pr-6 pl-2.5 py-0.5 rounded-full text-xs font-medium border cursor-pointer transition-colors disabled:opacity-50 ${
              active
                ? "bg-green-500/20 text-green-300 border-green-500/30"
                : "bg-gray-500/20 text-gray-400 border-gray-500/30"
            }`}
          >
            <option value="active">Active</option>
            <option value="hidden">Hidden</option>
          </select>
          {statusLoading
            ? <Loader2 size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 animate-spin text-gray-400 pointer-events-none" />
            : <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          }
        </div>
      </td>

      <td className="px-4 py-3">
        {confirming ? (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {deleteLoading ? <Loader2 size={11} className="animate-spin" /> : "Confirm"}
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="px-2.5 py-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex justify-end">
            <button
              onClick={() => setConfirming(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white/5 hover:bg-red-900/40 text-gray-400 hover:text-red-400 border border-white/10 hover:border-red-700/40 rounded-lg transition-colors"
            >
              <Trash2 size={11} />
              Delete
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
