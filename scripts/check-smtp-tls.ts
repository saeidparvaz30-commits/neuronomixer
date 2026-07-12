import nodemailer from "nodemailer";

async function main() {
  const strict = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    // no tls override: full cert validation
  });
  try {
    await strict.verify();
    console.log("STRICT TLS OK: certificate chain validates, override can be removed");
  } catch (err) {
    console.error("STRICT TLS FAILED:", (err as Error).message);
    process.exitCode = 1;
  }
}
main();
