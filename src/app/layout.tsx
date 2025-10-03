import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NeuroNomixer – Where Data Meets Intelligence",
  description: "Exploring data, AI, and life’s hidden codes.",
  openGraph: {
    title: "NeuroNomixer – Where Data Meets Intelligence",
    description: "Exploring data, AI, and life’s hidden codes.",
    url: "https://www.neuronomixer.com",
    siteName: "NeuroNomixer",
    images: [
      {
        url: "/og-image.png", // make sure this exists in /public
        width: 1200,
        height: 630,
        alt: "NeuroNomixer preview image",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NeuroNomixer – Where Data Meets Intelligence",
    description: "Exploring data, AI, and life’s hidden codes.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
