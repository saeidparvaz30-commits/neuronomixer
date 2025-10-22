import "../styles/globals.css";
import { Inter } from "next/font/google";
import Navbar from "@/components/appSkeleton/Navbar";
import Footer from "@/components/appSkeleton/Footer";
import { ThemeProvider } from "next-themes";
import FramerMotionProvider from "@/components/FrameMotionProvider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import GoogleAnalyticsTracker from "@/components/appSkeleton/GoogleAnalyticsTracker";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata = {
  title: "NeuroNomixer",
  description: "Exploring the intersection of AI, data & risk analytics.",
  other: {
    "google-site-verification": "8t9gazi3NGDeyZ028wx9oXj5K-O6fuTIWaPVQ9E0q2I",
  },
  icons: {
    icon: "/pictures/Logo.png",
    shortcut: "/pictures/Logo.png",
    apple: "/pictures/Logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} bg-[var(--background)] text-[var(--color-text)] transition-colors duration-300`}
      >
        {/* ✅ Google Analytics Scripts */}
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
        <FramerMotionProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <Navbar />
            <main className="pt-20"></main>
            <GoogleAnalyticsTracker />
            <main className="min-h-screen px-0 py-0">{children}</main>
            <Footer />
          </ThemeProvider>
        </FramerMotionProvider>
      </body>
    </html>
  );
}
