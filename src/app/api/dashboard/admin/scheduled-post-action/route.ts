import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { client } from "@/sanity/lib/client";
import { prisma } from "@/lib/prisma";
import { createMailTransport } from "@/lib/mailer";

// Handles three actions on scheduled posts:
//   post_now    — publish immediately (status → approved, publishedAt → now)
//   send_back   — return to pending review (status → pending, clear publishedAt)
//   reschedule  — update the scheduled date (keep status = scheduled)

export async function POST(req: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { postId, action, scheduledAt } = await req.json();

  if (!postId || !action) {
    return NextResponse.json({ error: "postId and action required" }, { status: 400 });
  }

  if (!["post_now", "send_back", "reschedule"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // Fetch post details
  const post = await client.fetch(
    `*[_id == $postId][0]{
      title,
      "slug": slug.current,
      "categorySlug": category->slug.current,
      "authorRef": author._ref,
      "categoryRef": category._ref,
      "authorName": author->name,
      "authorUserId": author->userId
    }`,
    { postId }
  );

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.neuronomixer.com").replace(/\/$/, "");

  // ── Post Now ────────────────────────────────────────────────────────────────
  if (action === "post_now") {
    const publishedAt = new Date().toISOString();
    try {
      await client.patch(postId).set({ status: "approved", publishedAt }).commit();
    } catch (err) {
      console.error("[scheduled-post-action] Sanity patch failed:", err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Sanity write failed" },
        { status: 500 }
      );
    }

    const postUrl = `${siteUrl}/blog/${post?.categorySlug}/${post?.slug}`;

    if (post?.authorUserId) {
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

    notifyAllUsers(post, postUrl, siteUrl).catch(() => {});

    return NextResponse.json({ success: true });
  }

  // ── Send Back for Review ────────────────────────────────────────────────────
  if (action === "send_back") {
    try {
      await client
        .patch(postId)
        .set({ status: "pending" })
        .unset(["publishedAt"])
        .commit();
    } catch (err) {
      console.error("[scheduled-post-action] Sanity patch failed:", err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Sanity write failed" },
        { status: 500 }
      );
    }

    if (post?.authorUserId) {
      await prisma.notification.create({
        data: {
          userId: post.authorUserId,
          type: "post_review",
          message: `Your post "${post.title}" has been sent back for additional review.`,
        },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  }

  // ── Reschedule ──────────────────────────────────────────────────────────────
  if (action === "reschedule") {
    if (!scheduledAt) {
      return NextResponse.json({ error: "scheduledAt required for reschedule" }, { status: 400 });
    }
    const newDate = new Date(scheduledAt);
    if (isNaN(newDate.getTime()) || newDate <= new Date()) {
      return NextResponse.json({ error: "scheduledAt must be a future date" }, { status: 400 });
    }

    try {
      await client
        .patch(postId)
        .set({ status: "scheduled", publishedAt: newDate.toISOString() })
        .commit();
    } catch (err) {
      console.error("[scheduled-post-action] Sanity patch failed:", err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Sanity write failed" },
        { status: 500 }
      );
    }

    if (post?.authorUserId) {
      await prisma.notification.create({
        data: {
          userId: post.authorUserId,
          type: "post_approved",
          message: `Your post "${post.title}" has been rescheduled to publish on ${newDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`,
        },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  }
}

async function notifyAuthor(userId: string, postTitle: string, postUrl: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!user?.email) return;

  await createMailTransport().sendMail({
    from: `"NeuroNomixer" <${process.env.SMTP_USER}>`,
    to: user.email,
    subject: `Your post "${postTitle}" is now live!`,
    text: `Hi ${user.name ?? "there"},\n\nYour post "${postTitle}" has just been published on NeuroNomixer.\n\nRead it here: ${postUrl}\n\n— NeuroNomixer`,
    html: `
      <p>Hi ${user.name ?? "there"},</p>
      <p>Your post <strong>"${postTitle}"</strong> is now live on NeuroNomixer!</p>
      <p style="margin:24px 0">
        <a href="${postUrl}" style="background:#1e5d8a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View Post</a>
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

  const transporter = createMailTransport();
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
