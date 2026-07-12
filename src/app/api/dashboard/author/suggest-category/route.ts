import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createMailTransport } from "@/lib/mailer";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (role !== "AUTHOR" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, description } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "Category name is required" }, { status: 400 });
  }

  const authorEmail = session!.user!.email ?? "unknown";

  const transporter = createMailTransport();

  await transporter.sendMail({
    from: `"NeuroNomixer" <${process.env.SMTP_USER}>`,
    to: process.env.CONTACT_RECIPIENT,
    subject: `Category Suggestion: "${name}"`,
    text: `Author: ${authorEmail}\nCategory: ${name}\nDescription: ${description ?? "(none)"}`,
    html: `
      <p><strong>Author:</strong> ${escapeHtml(authorEmail)}</p>
      <p><strong>Suggested Category:</strong> ${escapeHtml(name)}</p>
      <p><strong>Description:</strong> ${escapeHtml(description ?? "-")}</p>
    `,
  });

  return NextResponse.json({ success: true });
}
