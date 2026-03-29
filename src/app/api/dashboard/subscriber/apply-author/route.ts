import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { client } from "@/sanity/lib/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.authorStatus === "PENDING")
    return NextResponse.json({ error: "Application already pending" }, { status: 409 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const education  = (formData.get("education") as string)?.trim();
  const jobTitle   = (formData.get("jobTitle")  as string)?.trim();
  const employer   = (formData.get("employer")  as string)?.trim();
  const shortBio   = (formData.get("shortBio")  as string)?.trim();
  const longBioRaw = (formData.get("longBio")   as string)?.trim();
  const imageFile  = formData.get("image") as File | null;

  if (!shortBio)
    return NextResponse.json({ error: "Short bio is required" }, { status: 400 });
  if (!longBioRaw)
    return NextResponse.json({ error: "Long bio is required" }, { status: 400 });

  const name = user.name ?? session.user.name ?? "Unknown";
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now();

  // Convert plain text long bio to Sanity Portable Text
  const longBio = longBioRaw.split(/\n\n+/).filter(Boolean).map((para) => ({
    _type: "block",
    _key: Math.random().toString(36).slice(2, 9),
    style: "normal",
    markDefs: [],
    children: [{ _type: "span", _key: Math.random().toString(36).slice(2, 9), text: para, marks: [] }],
  }));

  // Upload profile image to Sanity if provided
  let imageAsset: { _type: string; asset: { _type: string; _ref: string } } | undefined;
  if (imageFile && imageFile.size > 0) {
    try {
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const asset = await client.assets.upload("image", buffer, {
        filename: imageFile.name,
        contentType: imageFile.type,
      });
      imageAsset = {
        _type: "image",
        asset: { _type: "reference", _ref: asset._id },
      };
    } catch {
      // Non-fatal — admin can add image later
    }
  }

  // Create Sanity author draft for admin review
  try {
    await client.create({
      _type: "author",
      name,
      slug: { _type: "slug", current: slug },
      email: session.user.email ?? "",
      userId: session.user.id,
      applicationStatus: "pending",
      shortBio,
      longBio,
      education: education || undefined,
      jobTitle:  jobTitle  || undefined,
      employer:  employer  || undefined,
      image:     imageAsset || undefined,
    });
  } catch (err) {
    console.error("Failed to create Sanity author doc:", err);
    return NextResponse.json({ error: "Failed to submit application. Please try again." }, { status: 500 });
  }

  // Mark user as pending in Prisma
  await prisma.user.update({
    where: { id: session.user.id },
    data: { authorStatus: "PENDING" },
  });

  return NextResponse.json({ success: true });
}
