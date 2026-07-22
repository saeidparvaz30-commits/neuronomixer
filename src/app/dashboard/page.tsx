import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardRootPage() {
  const session = await auth();
  const role = session?.user?.role;

  if (role === "ADMIN") redirect("/dashboard/admin");
  if (role === "AUTHOR") redirect("/dashboard/author");
  redirect("/dashboard/subscriber");
}
