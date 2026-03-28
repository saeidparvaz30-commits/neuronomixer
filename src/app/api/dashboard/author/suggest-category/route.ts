import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (role !== "AUTHOR" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, description } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "Category name is required" }, { status: 400 });
  }

  // Log suggestion — extend later with email notification or DB storage
  console.info(
    `[CategorySuggestion] Author ${session!.user!.email} suggested: "${name}" — ${description ?? ""}`
  );

  return NextResponse.json({ success: true });
}
