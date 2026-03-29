import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { client } from "@/sanity/lib/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    name?: string;
    shortBio?: string;
    longBio?: string;
    jobTitle?: string;
    employer?: string;
    education?: string;
    linkedIn?: string;
    github?: string;
    twitter?: string;
    personalWebsite?: string;
    contactEmail?: string;
    imageUrl?: string;
    imageAssetId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { name, shortBio, longBio, jobTitle, employer, education, linkedIn, github, twitter, personalWebsite, contactEmail, imageUrl, imageAssetId } = body;
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  // Update Prisma (name + image only — bio now lives in Sanity shortBio)
  const prismaData: Record<string, unknown> = { name: name.trim() };
  if (imageUrl) prismaData.image = imageUrl;

  const updated = await (prisma as any).user.update({
    where: { id: session.user.id },
    data: prismaData,
    select: { sanityAuthorId: true },
  });

  // Sync all author fields to Sanity
  if (updated.sanityAuthorId) {
    // Convert plain text longBio back to portable text blocks
    const longBioBlocks = longBio?.trim()
      ? longBio.trim().split(/\n\n+/).filter(Boolean).map((para, i) => ({
          _type: "block",
          _key: `bio_${i}`,
          style: "normal",
          markDefs: [],
          children: [{ _type: "span", _key: `span_${i}`, text: para.trim(), marks: [] }],
        }))
      : [];

    const patch: Record<string, unknown> = {
      name: name.trim(),
      shortBio: shortBio?.trim() ?? "",
      longBio: longBioBlocks,
      jobTitle: jobTitle?.trim() ?? "",
      employer: employer?.trim() ?? "",
      education: education?.trim() ?? "",
      linkedIn: linkedIn?.trim() ?? "",
      github: github?.trim() ?? "",
      twitter: twitter?.trim() ?? "",
      personalWebsite: personalWebsite?.trim() ?? "",
      email: contactEmail?.trim() ?? "",
    };

    if (imageAssetId) {
      patch.image = { _type: "image", asset: { _type: "reference", _ref: imageAssetId } };
    }

    try {
      await client.patch(updated.sanityAuthorId).set(patch).commit();
    } catch {
      // Non-fatal — Prisma update already succeeded
    }
  }

  return NextResponse.json({ success: true });
}
