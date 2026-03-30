"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";
import FramerMotionProvider from "@/components/FrameMotionProvider";

export default function ConditionalChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = pathname.startsWith("/cv/");

  if (bare) {
    return (
      <main className="min-h-screen">
        <FramerMotionProvider>{children}</FramerMotionProvider>
      </main>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24">
        <FramerMotionProvider>{children}</FramerMotionProvider>
      </main>
      <Footer />
    </>
  );
}
