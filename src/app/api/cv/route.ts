import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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
    linkedin, github, twitter, avatarUrl, birthYear,
    education, experience, skills, references,
    languages, projects, certifications, honors,
    isPublic, slug, sectionVisibility,
  } = body;

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
    birthYear: birthYear ?? null,
    education: education ?? [],
    experience: experience ?? [],
    skills: skills ?? [],
    references: references ?? [],
    languages: languages ?? [],
    projects: projects ?? [],
    certifications: certifications ?? [],
    honors: honors ?? [],
    isPublic: Boolean(isPublic),
    slug: slug?.trim() || null,
    sectionVisibility: sectionVisibility ?? {},
  };

  const cv = await prisma.authorCV.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...data },
    update: data,
  });

  // Invalidate the public page so it reflects the latest save immediately
  if (cv.slug) revalidatePath(`/cv/${cv.slug}`);

  return NextResponse.json({ cv });
}
