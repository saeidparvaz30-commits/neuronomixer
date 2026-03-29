import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_ROLES = ["ADMIN", "AUTHOR", "SUBSCRIBER"] as const;
type Role = (typeof VALID_ROLES)[number];

export async function POST(req: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { userId?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { userId, role } = body;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  if (!role || !VALID_ROLES.includes(role as Role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // When upgrading to AUTHOR, also mark authorStatus as APPROVED
  const data: Record<string, unknown> = { role };
  if (role === "AUTHOR") data.authorStatus = "APPROVED";
  if (role === "SUBSCRIBER") data.authorStatus = null;

  await (prisma as any).user.update({ where: { id: userId }, data });

  return NextResponse.json({ success: true });
}
