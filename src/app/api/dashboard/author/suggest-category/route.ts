import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import nodemailer from "nodemailer";

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

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: `"NeuroNomixer" <${process.env.SMTP_USER}>`,
    to: process.env.CONTACT_RECIPIENT,
    subject: `Category Suggestion: "${name}"`,
    text: `Author: ${authorEmail}\nCategory: ${name}\nDescription: ${description ?? "—"}`,
    html: `
      <p><strong>Author:</strong> ${authorEmail}</p>
      <p><strong>Suggested Category:</strong> ${name}</p>
      <p><strong>Description:</strong> ${description ?? "—"}</p>
    `,
  });

  return NextResponse.json({ success: true });
}
