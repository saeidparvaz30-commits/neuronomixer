import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import SharedPdfsClient from "./SharedPdfsClient";

export default async function SharedPdfsPage() {
  const session = await auth();
  if ((session?.user as { role?: string } | undefined)?.role !== "ADMIN") {
    redirect("/dashboard");
  }
  return <SharedPdfsClient />;
}
