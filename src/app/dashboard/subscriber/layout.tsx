import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import SubscriberSidebarNav from "@/components/dashboard/SubscriberSidebarNav";
import AuthorSidebarNav from "@/components/dashboard/AuthorSidebarNav";
import AdminSidebarNav from "@/components/dashboard/AdminSidebarNav";

export default async function SubscriberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/sign-in");

  const role = session.user?.role as string | undefined;

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true },
  });

  // Admins and authors keep their full sidebar when browsing subscriber pages
  if (role === "ADMIN") {
    return (
      <div className="min-h-screen bg-[var(--background)] flex pt-24">
        <AdminSidebarNav />
        <main className="flex-1 px-6 py-8 min-w-0">{children}</main>
      </div>
    );
  }

  if (role === "AUTHOR") {
    return (
      <div className="min-h-screen bg-[var(--background)] flex pt-24">
        <AuthorSidebarNav />
        <main className="flex-1 px-6 py-8 min-w-0">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] pt-24">
      <div className="max-w-6xl mx-auto px-4 pb-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {dbUser?.name?.split(" ")[0] ?? "Reader"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Your personal reading space</p>
        </div>

        <div className="flex gap-6 items-start">
          <SubscriberSidebarNav />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
