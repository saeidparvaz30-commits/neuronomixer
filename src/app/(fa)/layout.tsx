import "@/styles/globals.css";

export const metadata = {
  metadataBase: new URL("https://www.neuronomixer.com"),
  title: "NeuroNomixer",
};

export default function FaRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body className="bg-[var(--background)] text-[var(--color-text)]">
        {children}
      </body>
    </html>
  );
}
