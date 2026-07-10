import type { Metadata } from "next";
import KVCacheClient from "@/components/VisualGuides/KVCache/KVCacheClient";

export const metadata: Metadata = {
  title: "The KV Cache | NeuroNomixer",
  description:
    "Watch a KV cache fill cell by cell during decoding, size it with a real bytes calculator across layers, heads, and dtypes, and see the attention FLOPs it saves.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/kv-cache" },
  openGraph: {
    title: "The KV Cache | NeuroNomixer",
    description:
      "Watch a KV cache fill cell by cell during decoding, size it with a real bytes calculator across layers, heads, and dtypes, and see the attention FLOPs it saves.",
    url: "https://www.neuronomixer.com/visual-guides/kv-cache",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "The KV Cache",
    description:
      "Watch a KV cache fill cell by cell during decoding, size it with a real bytes calculator across layers, heads, and dtypes, and see the attention FLOPs it saves.",
  },
};

export default function KVCachePage() {
  return <KVCacheClient />;
}
