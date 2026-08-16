import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Settings } from "lucide-react";
import NotificationToggle from "./NotificationToggle";

export default async function SubscriberSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/sign-in");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true, emailNotifications: true },
  });

  if (!user) redirect("/auth/sign-in");

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Settings size={18} className="text-[var(--color-accent)]" />
        <h2 className="text-lg font-semibold text-white">Settings</h2>
      </div>

      <div className="flex flex-col gap-4">
        {/* Account info */}
        <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Account</h3>
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Name</p>
              <p className="text-sm text-gray-300">{user.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Email</p>
              <p className="text-sm text-gray-300">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-[#060d18]/80 border border-white/10 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Email Notifications</h3>
          <p className="text-xs text-gray-500 mb-5">
            Receive an email when a new post is published by an author or category you follow.
          </p>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-300">New post alerts</p>
              <p className="text-xs text-gray-600 mt-0.5">
                Sent to{" "}
                <span className="text-gray-400">{user.email}</span>
              </p>
            </div>
            <NotificationToggle enabled={user.emailNotifications} />
          </div>
        </div>
      </div>
    </div>
  );
}
