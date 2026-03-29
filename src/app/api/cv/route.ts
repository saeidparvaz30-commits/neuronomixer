import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cv = await prisma.authorCV.findUnique({ where: { userId: session.user.id } });
  return NextResponse.json({ cv: cv ?? null });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user?.id || (role !== "AUTHOR" && role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const {
    name, tagline, bio, location, email, phone, website,
    linkedin, github, twitter, avatarUrl,
    education, experience, skills, references,
    isPublic, slug,
  } = body;

  // Validate slug uniqueness (another user can't hold the same slug)
  if (slug) {
    const existing = await prisma.authorCV.findUnique({ where: { slug } });
    if (existing && existing.userId !== session.user.id) {
      return NextResponse.json({ error: "That slug is already taken." }, { status: 409 });
    }
  }

  const data = {
    name: name ?? null,
    tagline: tagline ?? null,
    bio: bio ?? null,
    location: location ?? null,
    email: email ?? null,
    phone: phone ?? null,
    website: website ?? null,
    linkedin: linkedin ?? null,
    github: github ?? null,
    twitter: twitter ?? null,
    avatarUrl: avatarUrl ?? null,
    education: education ?? [],
    experience: experience ?? [],
    skills: skills ?? [],
    references: references ?? [],
    isPublic: Boolean(isPublic),
    slug: slug?.trim() || null,
  };

  const cv = await prisma.authorCV.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...data },
    update: data,
  });

  return NextResponse.json({ cv });
}
