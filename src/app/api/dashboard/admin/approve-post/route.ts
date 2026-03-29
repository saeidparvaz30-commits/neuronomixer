import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { client } from "@/sanity/lib/client";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { postId } = await req.json();
  if (!postId) {
    return NextResponse.json({ error: "postId required" }, { status: 400 });
  }

  // Fetch post details before patching so we have author/category refs
  const post = await client.fetch(
    `*[_id == $postId][0]{
      title,
      "slug": slug.current,
      "authorRef": author._ref,
      "categoryRef": category._ref,
      "categorySlug": category->slug.current,
      "authorName": author->name
    }`,
    { postId }
  );

  await client
    .patch(postId)
    .set({ status: "approved", publishedAt: new Date().toISOString() })
    .commit();

  // Notify followers with emailNotifications enabled (fire-and-forget)
  if (post?.authorRef || post?.categoryRef) {
    notifyFollowers(post).catch((err) =>
      console.error("[approve-post] follower email error:", err)
    );
  }

  return NextResponse.json({ success: true });
}

async function notifyFollowers(post: {
  title: string;
  slug: string;
  authorRef?: string;
  categoryRef?: string;
  categorySlug?: string;
  authorName?: string;
}) {
  const orClauses = [
    post.authorRef ? { type: "author", sanityId: post.authorRef } : null,
    post.categoryRef ? { type: "category", sanityId: post.categoryRef } : null,
  ].filter(Boolean) as { type: string; sanityId: string }[];

  const follows = await prisma.follow.findMany({
    where: { OR: orClauses },
    include: {
      user: { select: { email: true, name: true, emailNotifications: true } },
    },
  });

  const recipientsMap = new Map<string, string>();
  for (const f of follows) {
    if (f.user.emailNotifications && f.user.email) {
      recipientsMap.set(f.user.email, f.user.name ?? "Reader");
    }
  }

  if (recipientsMap.size === 0) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const postUrl = `${siteUrl}/blog/${post.categorySlug ?? ""}/${post.slug}`;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  for (const [email, name] of recipientsMap) {
    await transporter.sendMail({
      from: `"NeuroNomixer" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `New post: ${post.title}`,
      text: `Hi ${name},\n\n${post.authorName ?? "An author"} just published "${post.title}".\n\nRead it here: ${postUrl}\n\n— NeuroNomixer`,
      html: `
        <p>Hi ${name},</p>
        <p><strong>${post.authorName ?? "An author"}</strong> just published a new article:</p>
        <p><a href="${postUrl}" style="font-size:1.1em;font-weight:bold;">${post.title}</a></p>
        <p><a href="${postUrl}">Read the article →</a></p>
        <hr/>
        <p style="font-size:0.8em;color:#888;">You're receiving this because you follow this author or category on NeuroNomixer. <a href="${siteUrl}/dashboard/subscriber">Manage notifications</a>.</p>
      `,
    }).catch(() => {/* skip per-recipient failures */});
  }
}
