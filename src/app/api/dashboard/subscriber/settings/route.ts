import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { emailNotifications } = await req.json();

  if (typeof emailNotifications !== "boolean") {
    return NextResponse.json({ error: "Invalid value" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { emailNotifications },
  });

  return NextResponse.json({ success: true });
}
