export const metadata = {
  title: "Privacy Policy | NeuroNomixer",
  description:
    "Learn how NeuroNomixer collects, stores, and protects your personal information in compliance with GDPR.",
  alternates: { canonical: "https://www.neuronomixer.com/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-[var(--color-text)]">
      <h1 className="text-4xl font-bold mb-8 text-[var(--color-accent)]">
        Privacy Policy
      </h1>

      <p className="mb-6 text-[var(--color-text-muted)]">
        Last updated: 20 April 2026
      </p>

      <section className="space-y-6 leading-relaxed">
        <p>
          NeuroNomixer ("we", "our", or "us") values your privacy. This Privacy
          Policy explains how we collect, use, and protect your personal
          information when you visit{" "}
          <span className="text-[var(--color-primary)] font-semibold">
            neuronomixer.com
          </span>{" "}
          or interact with our services.
        </p>

        <h2 className="text-2xl font-semibold mt-10 mb-3">1. Who we are</h2>
        <p>
          NeuroNomixer is a personal website and blog focused on data science,
          risk analytics, and technology. The site is owned and managed by{" "}
          <strong>Saeid Sheikhi</strong>, based in Norway.
        </p>

        <h2 className="text-2xl font-semibold mt-10 mb-3">
          2. Data we collect
        </h2>
        <p>We collect the following personal data:</p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>
            Your email address when you subscribe to updates or newsletters.
          </li>
          <li>
            Your name, email address, and profile picture when you sign in using
            Google OAuth.
          </li>
          <li>
            Your account role (subscriber or author) and any content you submit
            through your account.
          </li>
          <li>
            Anonymous analytics data (e.g., page views, referrers) via tools
            like Google Analytics.
          </li>
        </ul>

        <h2 className="text-2xl font-semibold mt-10 mb-3">
          3. Purpose of data collection
        </h2>
        <p>We use your data to:</p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>Authenticate you and manage your account on the site.</li>
          <li>Send you newsletters, updates, or blog notifications.</li>
          <li>Understand site performance and improve content.</li>
          <li>Protect the site against spam and abuse via reCAPTCHA.</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-10 mb-3">
          4. Legal basis for processing
        </h2>
        <p>
          We process your personal data based on your explicit consent under
          Article 6(1)(a) of the EU General Data Protection Regulation (GDPR),
          and on our legitimate interest in operating a secure, functioning
          service under Article 6(1)(f). You can withdraw consent at any time
          where consent is the legal basis.
        </p>

        <h2 className="text-2xl font-semibold mt-10 mb-3">
          5. How data is stored and protected
        </h2>
        <p>
          Subscriber emails are securely stored through{" "}
          <a
            href="https://www.brevo.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-primary)] underline"
          >
            Brevo (Sendinblue)
          </a>
          , an EU-based email platform compliant with GDPR. User account data
          (name, email, profile picture, and role) is stored in a{" "}
          <a
            href="https://supabase.com/security"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-primary)] underline"
          >
            Supabase PostgreSQL
          </a>{" "}
          database with encryption at rest. Data is never sold or shared with
          third parties beyond the processors named in this policy.
        </p>

        <h2 className="text-2xl font-semibold mt-10 mb-3">
          6. Third-party services
        </h2>
        <p>
          We use the following third-party services that may process your
          personal data as data processors:
        </p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>
            <strong>Google OAuth</strong> — used for sign-in. When you
            authenticate with Google, Google processes your credentials and
            shares your name, email, and profile picture with us. See{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-primary)] underline"
            >
              Google&apos;s Privacy Policy
            </a>
            .
          </li>
          <li>
            <strong>Google reCAPTCHA</strong> — used to protect forms from spam
            and abuse. reCAPTCHA collects hardware and software information and
            sends it to Google for analysis. See{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-primary)] underline"
            >
              Google&apos;s Privacy Policy
            </a>
            .
          </li>
          <li>
            <strong>Brevo (Sendinblue)</strong> — used to send newsletter and
            notification emails. See{" "}
            <a
              href="https://www.brevo.com/legal/privacypolicy/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-primary)] underline"
            >
              Brevo&apos;s Privacy Policy
            </a>
            .
          </li>
          <li>
            <strong>Supabase</strong> — used as our database provider. See{" "}
            <a
              href="https://supabase.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-primary)] underline"
            >
              Supabase&apos;s Privacy Policy
            </a>
            .
          </li>
        </ul>

        <h2 className="text-2xl font-semibold mt-10 mb-3">
          7. Your rights under GDPR
        </h2>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>Access the data we hold about you.</li>
          <li>Request correction or deletion of your data.</li>
          <li>Withdraw your consent for receiving communications.</li>
          <li>Lodge a complaint with your local data protection authority.</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-10 mb-3">
          8. Cookies and analytics
        </h2>
        <p>We use two categories of cookies:</p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>
            <strong>Necessary cookies</strong> — session and authentication
            cookies set by our sign-in system (NextAuth). These are required for
            you to stay signed in and cannot be disabled while you have an
            account session active.
          </li>
          <li>
            <strong>Analytics cookies</strong> — optional cookies used to
            understand site usage (e.g., page views). You can disable these in
            your browser settings at any time.
          </li>
        </ul>

        <h2 className="text-2xl font-semibold mt-10 mb-3">
          9. Data retention
        </h2>
        <p>
          We retain your email address only for as long as you remain
          subscribed. Account data is retained for as long as your account is
          active. You can request deletion of your account and associated data
          at any time by contacting us.
        </p>

        <h2 className="text-2xl font-semibold mt-10 mb-3">10. Contact</h2>
        <p>
          For any privacy-related inquiries or to exercise your rights, please
          contact{" "}
          <a
            href="mailto:contact@neuronomixer.com"
            className="text-[var(--color-primary)] underline"
          >
            contact@neuronomixer.com
          </a>
          .
        </p>
      </section>
    </main>
  );
}
