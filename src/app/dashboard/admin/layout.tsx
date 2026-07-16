import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminSidebarNav from "@/components/dashboard/AdminSidebarNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    redirect("/auth/sign-in");
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex pt-24">
      <AdminSidebarNav />
      {/* Main content */}
      <main className="flex-1 px-6 py-8 min-w-0">{children}</main>
    </div>
  );
}
