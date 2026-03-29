"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Loader2, Trash2, Ban, CheckCircle } from "lucide-react";

interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  role: "ADMIN" | "AUTHOR" | "SUBSCRIBER";
  vip: boolean;
  suspended: boolean;
  authorStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
  createdAt: Date;
}

type Role = "ADMIN" | "AUTHOR" | "SUBSCRIBER";

const ROLES: { value: Role; label: string; badge: string }[] = [
  { value: "ADMIN",      label: "Admin",      badge: "bg-purple-500/20 text-purple-300 border border-purple-500/30" },
  { value: "AUTHOR",     label: "Author",     badge: "bg-blue-500/20 text-blue-300 border border-blue-500/30"       },
  { value: "SUBSCRIBER", label: "Subscriber", badge: "bg-gray-500/20 text-gray-300 border border-gray-500/20"       },
];

function roleBadgeClass(role: Role) {
  return ROLES.find((r) => r.value === role)?.badge ?? "";
}

export default function UserRow({ user }: { user: UserData }) {
  const router = useRouter();
  const [vipLoading, setVipLoading]           = useState(false);
  const [roleLoading, setRoleLoading]         = useState(false);
  const [deleteLoading, setDeleteLoading]     = useState(false);
  const [suspendLoading, setSuspendLoading]   = useState(false);
  const [confirming, setConfirming]           = useState(false);
  const [showDropdown, setShowDropdown]       = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDropdown) return;
    function onOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [showDropdown]);

  async function toggleVip() {
    setVipLoading(true);
    try {
      const action = user.vip ? "remove-vip" : "grant-vip";
      await fetch(`/api/dashboard/admin/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      router.refresh();
    } finally {
      setVipLoading(false);
    }
  }

  async function toggleSuspend() {
    setSuspendLoading(true);
    try {
      const action = user.suspended ? "unsuspend-user" : "suspend-user";
      await fetch(`/api/dashboard/admin/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      router.refresh();
    } finally {
      setSuspendLoading(false);
    }
  }

  async function deleteUser() {
    setDeleteLoading(true);
    try {
      await fetch("/api/dashboard/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      router.refresh();
    } finally {
      setDeleteLoading(false);
      setConfirming(false);
    }
  }

  async function changeRole(newRole: Role) {
    if (newRole === user.role) { setShowDropdown(false); return; }
    setShowDropdown(false);
    setRoleLoading(true);
    try {
      await fetch("/api/dashboard/admin/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, role: newRole }),
      });
      router.refresh();
    } finally {
      setRoleLoading(false);
    }
  }

  return (
    <tr className={`text-gray-300 hover:bg-white/5 transition-colors ${user.suspended ? "opacity-60" : ""}`}>
      <td className="px-4 py-3 font-medium text-white">
        <div className="flex items-center gap-2">
          {user.name ?? "—"}
          {user.suspended && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-400 border border-red-500/20">
              Suspended
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-gray-400 text-xs">{user.email ?? "—"}</td>

      {/* Role dropdown */}
      <td className="px-4 py-3">
        <div ref={dropdownRef} className="relative inline-block">
          <button
            onClick={() => setShowDropdown((v) => !v)}
            disabled={roleLoading}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-opacity hover:opacity-80 ${roleBadgeClass(user.role)}`}
            title="Click to change role"
          >
            {roleLoading ? <Loader2 size={10} className="animate-spin" /> : user.role}
            <ChevronDown size={10} className={`transition-transform ${showDropdown ? "rotate-180" : ""}`} />
          </button>

          {showDropdown && (
            <div className="absolute left-0 top-full mt-1.5 z-50 w-36 bg-gray-900 border border-white/15 rounded-xl shadow-2xl overflow-hidden">
              {ROLES.map(({ value, label, badge }) => (
                <button
                  key={value}
                  onClick={() => changeRole(value)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-xs hover:bg-white/5 transition-colors"
                >
                  <span className={`px-2 py-0.5 rounded-full font-medium ${badge}`}>{label}</span>
                  {user.role === value && <Check size={11} className="text-[var(--color-accent)]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </td>

      <td className="px-4 py-3">
        {user.vip ? (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300">VIP</span>
        ) : (
          <span className="text-gray-600 text-xs">—</span>
        )}
      </td>

      <td className="px-4 py-3 text-gray-500 text-xs">
        {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={toggleVip}
            disabled={vipLoading}
            className="text-xs px-3 py-1 rounded-lg border border-white/10 hover:border-[var(--color-accent)]/50 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            {vipLoading ? "..." : user.vip ? "Remove VIP" : "Grant VIP"}
          </button>

          <button
            onClick={toggleSuspend}
            disabled={suspendLoading}
            className={`text-xs px-3 py-1 rounded-lg border transition-colors disabled:opacity-50 flex items-center gap-1 ${
              user.suspended
                ? "border-green-700/50 text-green-400 hover:bg-green-900/20"
                : "border-white/10 hover:border-orange-700/50 text-gray-400 hover:text-orange-400"
            }`}
          >
            {suspendLoading
              ? <Loader2 size={10} className="animate-spin" />
              : user.suspended
              ? <><CheckCircle size={11} /> Reactivate</>
              : <><Ban size={11} /> Deactivate</>
            }
          </button>

          {confirming ? (
            <>
              <button
                onClick={deleteUser}
                disabled={deleteLoading}
                className="text-xs px-3 py-1 rounded-lg bg-red-700 hover:bg-red-600 text-white transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {deleteLoading ? <Loader2 size={10} className="animate-spin" /> : "Confirm"}
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="text-xs px-3 py-1 rounded-lg border border-white/10 hover:bg-white/5 text-gray-400 transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="text-xs px-3 py-1 rounded-lg border border-white/10 hover:border-red-700/50 text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1"
            >
              <Trash2 size={11} />
              Delete
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
