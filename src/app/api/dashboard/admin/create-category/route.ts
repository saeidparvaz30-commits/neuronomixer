import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { client } from "@/sanity/lib/client";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const title = (formData.get("title") as string | null)?.trim();
  const description = (formData.get("description") as string | null)?.trim();
  const imageFile = formData.get("image") as File | null;

  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  // Upload image to Sanity asset store if provided
  let imageField: object | undefined;
  if (imageFile && imageFile.size > 0) {
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const asset = await client.assets.upload("image", buffer, {
      filename: imageFile.name,
      contentType: imageFile.type || "image/jpeg",
    });
    imageField = {
      _type: "image",
      asset: { _type: "reference", _ref: asset._id },
    };
  }

  const doc = {
    _type: "category",
    title,
    slug: { _type: "slug", current: slugify(title) },
    ...(description ? { description } : {}),
    ...(imageField ? { image: imageField } : {}),
    active: true,
  };

  const created = await client.create(doc);
  return NextResponse.json({ success: true, id: created._id });
}
