import { NextRequest, NextResponse } from "next/server";
import { client } from "@/sanity/lib/client";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

// Vercel calls this route on a schedule defined in vercel.json.
// It finds all posts with status="scheduled" whose publishedAt has passed
// and flips them to status="approved" (making them live on the blog).

export async function GET(req: NextRequest) {
  // Protect with CRON_SECRET so only Vercel (or an authorised caller) can trigger it.
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();

  // Fetch posts that are scheduled and whose publishedAt is in the past/now
  const duePosts = await client.fetch<
    {
      _id: string;
      title: string;
      slug: string;
      categorySlug: string;
      authorName: string;
      authorUserId: string;
      authorRef: string;
      categoryRef: string;
    }[]
  >(
    `*[_type == "post" && status == "scheduled" && publishedAt <= $now]{
      _id,
      title,
      "slug": slug.current,
      "categorySlug": category->slug.current,
      "authorName": author->name,
      "authorUserId": author->userId,
      "authorRef": author._ref,
      "categoryRef": category._ref
    }`,
    { now }
  );

  if (duePosts.length === 0) {
    return NextResponse.json({ published: 0 });
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.neuronomixer.com").replace(/\/$/, "");

  let published = 0;
  for (const post of duePosts) {
    try {
      await client.patch(post._id).set({ status: "approved" }).commit();
      published++;

      const postUrl = `${siteUrl}/blog/${post.categorySlug}/${post.slug}`;

      // In-app notification to author
      if (post.authorUserId) {
        await prisma.notification.create({
          data: {
            userId: post.authorUserId,
            type: "post_approved",
            message: `Your post "${post.title}" is now live!`,
            link: postUrl,
          },
        }).catch(() => {});

        notifyAuthor(post.authorUserId, post.title, postUrl).catch(() => {});
      }

      // Notify all opted-in members
      notifyAllUsers(post, postUrl, siteUrl).catch(() => {});
    } catch (err) {
      console.error(`[publish-scheduled] Failed to publish post ${post._id}:`, err);
    }
  }

  console.log(`[publish-scheduled] Published ${published}/${duePosts.length} scheduled posts`);
  return NextResponse.json({ published });
}

function makeTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls: { rejectUnauthorized: false },
  });
}

async function notifyAuthor(userId: string, postTitle: string, postUrl: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!user?.email) return;

  await makeTransporter().sendMail({
    from: `"NeuroNomixer" <${process.env.SMTP_USER}>`,
    to: user.email,
    subject: `Your post "${postTitle}" is now live!`,
    text: `Hi ${user.name ?? "there"},\n\nYour scheduled post "${postTitle}" has just been published on NeuroNomixer.\n\nRead it here: ${postUrl}\n\n— NeuroNomixer`,
    html: `
      <p>Hi ${user.name ?? "there"},</p>
      <p>Your scheduled post <strong>"${postTitle}"</strong> has just gone live on NeuroNomixer!</p>
      <p style="margin:24px 0">
        <a href="${postUrl}" style="background:#1e5d8a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
          View Your Post
        </a>
      </p>
      <p style="color:#888;font-size:0.85em">— NeuroNomixer Team</p>
    `,
  });
}

async function notifyAllUsers(
  post: { title: string; authorName?: string },
  postUrl: string,
  siteUrl: string
) {
  const users = await prisma.user.findMany({
    where: {
      emailNotifications: true,
      email: { not: null },
      emailVerified: { not: null },
    },
    select: { id: true, email: true, name: true },
  });

  if (users.length === 0) return;

  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      type: "new_post",
      message: `New post: "${post.title}"`,
      link: postUrl,
    })),
    skipDuplicates: true,
  });

  const transporter = makeTransporter();
  for (const user of users) {
    if (!user.email) continue;
    const name = user.name ?? "Reader";
    await transporter.sendMail({
      from: `"NeuroNomixer" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: `New post: ${post.title}`,
      text: `Hi ${name},\n\n${post.authorName ?? "An author"} just published "${post.title}".\n\nRead it here: ${postUrl}\n\n— NeuroNomixer`,
      html: `
        <p>Hi ${name},</p>
        <p><strong>${post.authorName ?? "An author"}</strong> just published a new article:</p>
        <p><a href="${postUrl}" style="font-size:1.1em;font-weight:bold;">${post.title}</a></p>
        <p style="margin:16px 0"><a href="${postUrl}" style="background:#1e5d8a;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:600;">Read the article →</a></p>
        <hr/>
        <p style="font-size:0.8em;color:#888;">You're receiving this as a NeuroNomixer member. <a href="${siteUrl}/dashboard/subscriber">Manage notifications</a>.</p>
      `,
    }).catch(() => {});
  }
}
