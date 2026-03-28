import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { client } from "@/sanity/lib/client";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  let body: { role?: string; name?: string; bio?: string; motivation?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { role, name, bio, motivation } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (role === "AUTHOR") {
    if (!bio?.trim()) {
      return NextResponse.json({ error: "Bio is required for authors" }, { status: 400 });
    }
    if (!motivation?.trim()) {
      return NextResponse.json({ error: "Motivation is required for authors" }, { status: 400 });
    }
  }

  const isAuthorRequest = role === "AUTHOR";

  // Update Prisma user
  await prisma.user.update({
    where: { id: userId },
    data: {
      name: name.trim(),
      bio: bio?.trim() ?? null,
      motivation: isAuthorRequest ? motivation?.trim() : null,
      onboarded: true,
      // Authors stay as SUBSCRIBER until approved by admin
      role: "SUBSCRIBER",
      authorStatus: isAuthorRequest ? "PENDING" : null,
    },
  });

  // If applying as author, create a Sanity author draft for admin review
  if (isAuthorRequest) {
    try {
      const slug = name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

      await client.create({
        _type: "author",
        name: name.trim(),
        slug: { _type: "slug", current: slug },
        shortBio: bio?.trim(),
        userId,
        applicationStatus: "pending",
        email: session.user.email ?? "",
      });
    } catch (err) {
      console.error("Failed to create Sanity author draft:", err);
      // Don't fail the whole request — admin can create manually
    }
  }

  return NextResponse.json({ success: true });
}
