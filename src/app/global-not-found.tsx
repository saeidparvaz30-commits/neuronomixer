// Global 404 for URLs that match no route group.
//
// Once the only root layout moved into (en), src/app/(en)/not-found.tsx stopped
// serving fully unmatched URLs and Next's unbranded default took over. This file
// is the documented fix and is enabled by experimental.globalNotFound in
// next.config.ts (OQ-1 contingency, approved 2026-08-16).
//
// It renders outside every layout, so globals.css and the Inter font are NOT
// available here. Styles are inline on purpose; the palette mirrors
// src/styles/variables.css so this stays visually consistent with the site.

import Link from "next/link";

export const metadata = {
  title: "Page not found | NeuroNomixer",
  description: "The page you are looking for does not exist or has moved.",
};

const BACKGROUND = "#0f172a";
const TEXT = "#f1f5f9";
const TEXT_MUTED = "#94a3b8";
const ACCENT = "#d4af37";

const FONT_STACK =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 1.5rem",
          backgroundColor: BACKGROUND,
          color: TEXT,
          fontFamily: FONT_STACK,
        }}
      >
        <p
          style={{
            margin: "0 0 0.75rem",
            fontSize: "13px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            color: ACCENT,
          }}
        >
          404
        </p>
        <h1 style={{ margin: "0 0 0.75rem", fontSize: "1.875rem", fontWeight: 700 }}>
          Page not found
        </h1>
        <p style={{ margin: "0 0 2rem", maxWidth: "28rem", color: TEXT_MUTED }}>
          The page you are looking for does not exist or has moved.
        </p>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link
            href="/"
            style={{
              padding: "0.625rem 1.25rem",
              borderRadius: "0.75rem",
              backgroundColor: ACCENT,
              color: "#0a0e1a",
              fontSize: "0.875rem",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Back to home
          </Link>
          <Link
            href="/blog"
            style={{
              padding: "0.625rem 1.25rem",
              borderRadius: "0.75rem",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              color: "#d1d5db",
              fontSize: "0.875rem",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Browse the blog
          </Link>
        </div>
      </body>
    </html>
  );
}
