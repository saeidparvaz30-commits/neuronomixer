import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, Users, Clock, Settings, Rss } from "lucide-react";

const navItems = [
  { href: "/dashboard/subscriber", label: "Feed", icon: Rss, exact: true },
  { href: "/dashboard/subscriber/history", label: "Reading History", icon: Clock },
  { href: "/dashboard/subscriber/following", label: "Following", icon: Users },
  { href: "/dashboard/subscriber/settings", label: "Settings", icon: Settings },
];

export default async function SubscriberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/sign-in");

  return (
    <div className="min-h-screen bg-[var(--background)] pt-24">
      <div className="max-w-6xl mx-auto px-4 pb-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {session.user.name?.split(" ")[0] ?? "Reader"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Your personal reading space</p>
        </div>

        <div className="flex gap-6 items-start">
          {/* Sidebar */}
          <aside className="hidden md:block w-52 shrink-0">
            <nav className="flex flex-col gap-1 bg-[#060d18]/80 border border-white/10 rounded-2xl p-3">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Icon size={15} />
                  {label}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Mobile nav */}
          <div className="md:hidden w-full mb-4">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-white bg-[#060d18]/80 border border-white/10 whitespace-nowrap transition-colors"
                >
                  <Icon size={14} />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Main content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
