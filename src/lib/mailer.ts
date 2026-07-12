import nodemailer from "nodemailer";

/**
 * Single SMTP transporter factory for all outbound mail.
 * Strict TLS by default. SMTP_TLS_INSECURE=true is an emergency escape hatch
 * for the historical Namecheap incomplete-chain problem; leave it UNSET.
 */
export function createMailTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    ...(process.env.SMTP_TLS_INSECURE === "true"
      ? { tls: { rejectUnauthorized: false } }
      : {}),
  });
}
