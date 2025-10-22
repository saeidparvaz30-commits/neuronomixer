export const metadata = {
  title: "Privacy Policy | NeuroNomixer",
  description:
    "Learn how NeuroNomixer collects, stores, and protects your personal information in compliance with GDPR.",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-[var(--color-text)]">
      <h1 className="text-4xl font-bold mb-8 text-[var(--color-accent)]">
        Privacy Policy
      </h1>

      <p className="mb-6 text-[var(--color-text-muted)]">
        Last updated:{" "}
        {new Date().toLocaleDateString("en-GB", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>

      <section className="space-y-6 leading-relaxed">
        <p>
          NeuroNomixer (“we”, “our”, or “us”) values your privacy. This Privacy
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
        <p>
          We only collect personal data that you voluntarily provide, such as:
        </p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>
            Your email address when you subscribe to updates or newsletters.
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
          <li>Send you newsletters, updates, or blog notifications.</li>
          <li>Understand site performance and improve content.</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-10 mb-3">
          4. Legal basis for processing
        </h2>
        <p>
          We process your personal data based on your explicit consent under
          Article 6(1)(a) of the EU General Data Protection Regulation (GDPR).
          You can withdraw this consent at any time.
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
          , an EU-based email platform compliant with GDPR. Data is encrypted at
          rest and never shared with third parties.
        </p>

        <h2 className="text-2xl font-semibold mt-10 mb-3">
          6. Your rights under GDPR
        </h2>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>Access the data we hold about you.</li>
          <li>Request correction or deletion of your data.</li>
          <li>Withdraw your consent for receiving communications.</li>
          <li>Lodge a complaint with your local data protection authority.</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-10 mb-3">
          7. Cookies and analytics
        </h2>
        <p>
          We may use cookies or similar technologies for basic analytics
          purposes. You can disable cookies in your browser at any time. No
          personally identifiable data is collected without consent.
        </p>

        <h2 className="text-2xl font-semibold mt-10 mb-3">8. Data retention</h2>
        <p>
          We retain your email address only for as long as you remain
          subscribed. You can unsubscribe at any time using the link in our
          emails or by contacting us directly.
        </p>

        <h2 className="text-2xl font-semibold mt-10 mb-3">9. Contact</h2>
        <p>
          For any privacy-related inquiries or to exercise your rights, please
          contact
          <a href="mailto:contact@neuronomixer.com"> our email.</a>
        </p>
      </section>
    </main>
  );
}
