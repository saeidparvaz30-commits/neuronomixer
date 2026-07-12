import "../styles/globals.css";
import { Inter } from "next/font/google";
import ConditionalChrome from "@/components/appSkeleton/ConditionalChrome";
import { GeneralSignupPrompt } from "@/components/prompts";
import { FlushPendingCompletions } from "@/components/FlushPendingCompletions";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import GoogleAnalyticsTracker from "@/components/appSkeleton/GoogleAnalyticsTracker";
import NextAuthProvider from "@/components/appSkeleton/NextAuthProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL("https://www.neuronomixer.com"),
  title: {
    default: "NeuroNomixer",
    template: "%s — NeuroNomixer",
  },
  description: "Exploring the intersection of AI, data & risk analytics.",
  openGraph: {
    siteName: "NeuroNomixer",
    type: "website" as const,
    images: [{ url: "/pictures/Logo.png", alt: "NeuroNomixer" }],
  },
  twitter: {
    card: "summary_large_image" as const,
    site: "@neuronomixer",
  },
  other: {
    "google-site-verification": "8t9gazi3NGDeyZ028wx9oXj5K-O6fuTIWaPVQ9E0q2I",
  },
  // Favicon is served from the simplified src/app/icon.svg (Next file convention).
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} bg-[var(--background)] text-[var(--color-text)] transition-colors duration-300`}
      >
        {/* ✅ Google Analytics */}
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', {
                page_path: window.location.pathname,
              });
            `,
          }}
        />

        <NextAuthProvider>
          <ConditionalChrome>{children}</ConditionalChrome>
          <GeneralSignupPrompt />
          <FlushPendingCompletions />
          <GoogleAnalyticsTracker />
          <SpeedInsights />
        </NextAuthProvider>
      </body>
    </html>
  );
}
