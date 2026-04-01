"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import Fuse from "fuse.js";

// ─── Types ───────────────────────────────────────────────────────────────────

type CategoryMeta = {
  _id: string;
  title: string;
  slug: { current: string };
  intuitive?: boolean;
};

type BlogPost = {
  _id: string;
  title: string;
  slug: { current: string };
  description?: string;
  bodyExcerpt?: string;
  publishedAt?: string;
  mainImage?: string;
  featured?: boolean;
  category?: { _id: string; title: string; slug: { current: string } };
  author?: {
    _id: string;
    name: string;
    slug?: { current: string };
    image?: string;
    jobTitle?: string;
  };
};

type AuthorMeta = {
  _id: string;
  name: string;
  slug?: { current: string };
  image?: string;
  jobTitle?: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ─── Neural background ───────────────────────────────────────────────────────

function NeuralBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const DPR = window.devicePixelRatio || 1;
    const PARTICLE_COUNT = 55;
    const CONNECTION_DIST = 150;
    const SPEED = 0.25;

    type Particle = { x: number; y: number; vx: number; vy: number; r: number; brightness: number };
    let W = 0, H = 0;
    let ctx: CanvasRenderingContext2D | null = null;
    let rafId = 0;
    const particles: Particle[] = [];

    function resize() {
      if (!canvas) return;
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(DPR, DPR);
    }

    resize();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * SPEED,
        vy: (Math.random() - 0.5) * SPEED,
        r: Math.random() * 1.5 + 0.5,
        brightness: Math.random() * 0.25 + 0.08,
      });
    }

    function animate() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);

      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.1;
            ctx.strokeStyle = `rgba(212,175,55,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      for (const p of particles) {
        ctx.fillStyle = `rgba(212,175,55,${p.brightness})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      rafId = requestAnimationFrame(animate);
    }

    animate();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ src, name, size = 28 }: { src?: string; name: string; size?: number }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-gradient-to-br from-[#3bb4a4] to-[#1e5d8a] flex items-center justify-center text-white font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {initials(name)}
    </div>
  );
}

// ─── Featured card ────────────────────────────────────────────────────────────

function FeaturedCard({ post }: { post: BlogPost }) {
  const href = post.category
    ? `/blog/${post.category.slug.current}/${post.slug.current}`
    : "#";
  return (
    <Link
      href={href}
      className="group grid grid-cols-1 md:grid-cols-[1.2fr_1fr] rounded-2xl overflow-hidden border border-[#1e293b] bg-[#0f172a] hover:border-[#334155] hover:-translate-y-[2px] transition-all duration-300"
    >
      <div className="relative h-56 md:h-auto overflow-hidden bg-gradient-to-br from-[#0f172a] to-[#1e293b]">
        {post.mainImage ? (
          <img
            src={post.mainImage}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1e5d8a]/30 to-[#1e293b]" />
        )}
        <span className="absolute top-4 left-4 px-3 py-1 rounded-md bg-[#d4af37] text-[#0a0e1a] text-[11px] font-bold uppercase tracking-wide">
          Featured
        </span>
      </div>
      <div className="p-7 flex flex-col justify-center">
        {post.category && (
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#d4af37] mb-3">
            {post.category.title}
          </p>
        )}
        <h2 className="text-xl font-bold text-white leading-snug mb-3 line-clamp-3">
          {post.title}
        </h2>
        {post.description && (
          <p className="text-sm text-[#94a3b8] leading-relaxed mb-5 line-clamp-3">
            {post.description}
          </p>
        )}
        <div className="flex items-center gap-2 text-[12px] text-[#64748b] flex-wrap">
          {post.author && <Avatar src={post.author.image} name={post.author.name} size={26} />}
          {post.author && (
            <span className="text-[#e2e8f0] font-medium">{post.author.name}</span>
          )}
          {post.publishedAt && (
            <>
              <span className="text-[#334155]">·</span>
              <span>{formatDate(post.publishedAt)}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Post card ────────────────────────────────────────────────────────────────

function PostCard({ post }: { post: BlogPost }) {
  const href = post.category
    ? `/blog/${post.category.slug.current}/${post.slug.current}`
    : "#";
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl overflow-hidden border border-[#1e293b] bg-[#0f172a] hover:border-[#334155] hover:-translate-y-[3px] transition-all duration-200 h-full"
    >
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-[#1e293b] to-[#0f172a]">
        {post.mainImage ? (
          <img
            src={post.mainImage}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1e5d8a]/20 to-[#1e293b]" />
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        {post.category && (
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#d4af37] mb-2">
            {post.category.title}
          </p>
        )}
        <h3 className="text-[15px] font-semibold text-white leading-snug mb-2 line-clamp-2 flex-1">
          {post.title}
        </h3>
        {post.description && (
          <p className="text-[13px] text-[#94a3b8] leading-relaxed mb-3 line-clamp-2">
            {post.description}
          </p>
        )}
        <div className="flex items-center gap-1.5 text-[11px] text-[#64748b] mt-auto">
          {post.author && <Avatar src={post.author.image} name={post.author.name} size={20} />}
          {post.author && <span>{post.author.name}</span>}
          {post.publishedAt && (
            <>
              <span className="text-[#334155]">·</span>
              <span>{formatDate(post.publishedAt)}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Search result card (list view) ──────────────────────────────────────────

function SearchResultCard({ post }: { post: BlogPost }) {
  const href = post.category
    ? `/blog/${post.category.slug.current}/${post.slug.current}`
    : "#";
  return (
    <Link
      href={href}
      className="group flex gap-4 rounded-xl border border-[#1e293b] bg-[#0f172a] hover:border-[#334155] hover:bg-[#111827] transition-all duration-200 p-4"
    >
      <div className="shrink-0 w-[80px] h-[80px] rounded-lg overflow-hidden bg-gradient-to-br from-[#1e293b] to-[#0f172a]">
        {post.mainImage ? (
          <img
            src={post.mainImage}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1e5d8a]/20 to-[#1e293b]" />
        )}
      </div>
      <div className="flex flex-col justify-center min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {post.category && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#d4af37] bg-[#d4af37]/10 px-2 py-0.5 rounded-md">
              {post.category.title}
            </span>
          )}
        </div>
        <h3 className="text-[15px] font-semibold text-white leading-snug line-clamp-1 mb-1">
          {post.title}
        </h3>
        {post.description && (
          <p className="text-[13px] text-[#94a3b8] leading-relaxed line-clamp-2 mb-2">
            {post.description}
          </p>
        )}
        <div className="flex items-center gap-1.5 text-[11px] text-[#64748b]">
          {post.author && <Avatar src={post.author.image} name={post.author.name} size={18} />}
          {post.author && <span>{post.author.name}</span>}
          {post.publishedAt && (
            <>
              <span className="text-[#334155]">·</span>
              <span>{formatDate(post.publishedAt)}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Sidebar card ─────────────────────────────────────────────────────────────

function SidebarCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-5">
      <h4 className="text-[11px] font-semibold uppercase tracking-widest text-[#475569] mb-3">
        {title}
      </h4>
      {children}
    </div>
  );
}

// ─── Sidebar subscribe ────────────────────────────────────────────────────────

function SidebarSubscribe() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { executeRecaptcha } = useGoogleReCaptcha();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      if (!executeRecaptcha) {
        setMessage("Captcha not ready. Please try again.");
        return;
      }
      const token = await executeRecaptcha("subscribe_form");
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });
      const data = await res.json();
      setMessage(data.message);
      if (data.success) setEmail("");
    } catch {
      setMessage("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="rounded-xl p-5 border"
      style={{
        background: "linear-gradient(135deg, rgba(212,175,55,0.08), rgba(30,93,138,0.08))",
        borderColor: "rgba(212,175,55,0.15)",
      }}
    >
      <h4 className="text-[11px] font-semibold uppercase tracking-widest text-[#475569] mb-2">
        Stay in the loop
      </h4>
      <p className="text-[12px] text-[#94a3b8] mb-3 leading-relaxed">
        Get new posts delivered to your inbox. No spam, unsubscribe anytime.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-[#1e293b] bg-[#0a0e1a] text-white text-[12px] outline-none transition placeholder-[#475569]"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-3.5 py-2 rounded-lg bg-[#d4af37] text-[#0a0e1a] text-[12px] font-semibold hover:opacity-90 disabled:opacity-60 transition whitespace-nowrap"
          >
            {loading ? "…" : "Join"}
          </button>
        </div>
        {message && (
          <p
            className={`mt-2 text-[11px] ${
              message.toLowerCase().includes("success") ? "text-green-400" : "text-red-400"
            }`}
          >
            {message}
          </p>
        )}
      </form>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function BlogClient({
  categories,
  posts,
  authors,
  trendingSlugOrder = [],
}: {
  categories: CategoryMeta[];
  posts: BlogPost[];
  authors: AuthorMeta[];
  trendingSlugOrder?: string[];
}) {
  const [selectedCat, setSelectedCat] = useState("_all");
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [visibleCount, setVisibleCount] = useState(7);
  const inputRef = useRef<HTMLInputElement>(null);

  const isSearching = submittedQuery.trim().length > 0;

  // ── Fuse.js instance (recreated only when posts change) ──────────────────
  const fuse = useMemo(
    () =>
      new Fuse(posts, {
        threshold: 0.35,
        ignoreLocation: true,
        keys: [
          { name: "title",          weight: 0.45 },
          { name: "description",    weight: 0.25 },
          { name: "bodyExcerpt",    weight: 0.15 },
          { name: "author.name",    weight: 0.10 },
          { name: "category.title", weight: 0.05 },
        ],
      }),
    [posts]
  );

  // ── Search results (Fuse.js, triggered by submittedQuery) ────────────────
  const searchResults = useMemo(() => {
    if (!submittedQuery.trim()) return [];
    let results = fuse.search(submittedQuery).map((r) => r.item);
    if (selectedCat !== "_all") {
      results = results.filter((p) => p.category?._id === selectedCat);
    }
    return results;
  }, [fuse, submittedQuery, selectedCat]);

  // ── Filtered posts for normal (non-search) grid view ────────────────────
  const filtered = useMemo(() => {
    let result = [...posts];
    if (selectedCat !== "_all") {
      result = result.filter((p) => p.category?._id === selectedCat);
    }
    if (sort === "oldest") {
      result.sort(
        (a, b) =>
          new Date(a.publishedAt ?? 0).getTime() -
          new Date(b.publishedAt ?? 0).getTime()
      );
    }
    return result;
  }, [posts, selectedCat, sort]);

  const featured = filtered.find((p) => p.featured) ?? filtered[0] ?? null;
  const nonFeatured = featured ? filtered.filter((p) => p._id !== featured._id) : filtered.slice(1);
  const gridPosts = nonFeatured.slice(0, visibleCount - 1);
  const hasMore = nonFeatured.length > visibleCount - 1;

  const catCountMap = useMemo(() => {
    const m: Record<string, number> = {};
    posts.forEach((p) => {
      if (p.category?._id) m[p.category._id] = (m[p.category._id] ?? 0) + 1;
    });
    return m;
  }, [posts]);

  const trending = useMemo(() => {
    const result: BlogPost[] = [];
    for (const slug of trendingSlugOrder) {
      const p = posts.find((p) => p.slug.current === slug);
      if (p && result.length < 4) result.push(p);
    }
    for (const p of posts) {
      if (result.length >= 4) break;
      if (!result.find((t) => t._id === p._id)) result.push(p);
    }
    return result;
  }, [posts, trendingSlugOrder]);

  // ── Keyboard shortcut: ⌘K / Ctrl+K focuses the search input ─────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function handleCat(id: string) { setSelectedCat(id); setVisibleCount(7); }
  function handleSort(s: string) { setSort(s as "newest" | "oldest"); setVisibleCount(7); }

  function triggerSearch() {
    const q = searchQuery.trim();
    if (q) setSubmittedQuery(q);
  }

  function clearSearch() {
    setSearchQuery("");
    setSubmittedQuery("");
    inputRef.current?.focus();
  }

  return (
    <>
      <NeuralBackground />
      <div className="relative z-[1] max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div className="pt-10 pb-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">Blog</h1>
          <p className="mt-2 text-[#94a3b8] text-sm max-w-md mx-auto">
            Explore AI breakthroughs, data science roadmaps, and engineering insights.
          </p>
          <div className="mt-6 max-w-[560px] mx-auto relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#475569] pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") triggerSearch(); }}
              placeholder="Search articles, topics, authors…"
              className="w-full py-3.5 pl-12 pr-24 rounded-xl border border-[#1e293b] bg-[#0f172a] text-white placeholder-[#475569] text-sm outline-none transition"
              style={{
                boxShadow: isSearching ? "0 0 0 3px rgba(212,175,55,0.1)" : "none",
                borderColor: isSearching ? "#d4af37" : "#1e293b",
              }}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {isSearching && (
                <button
                  onClick={clearSearch}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-[#64748b] hover:text-white hover:bg-white/10 transition"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
              <button
                onClick={triggerSearch}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#d4af37] text-[#0a0e1a] text-[12px] font-semibold hover:opacity-90 transition"
                aria-label="Search"
              >
                <Search size={12} />
                Search
              </button>
            </div>
          </div>
        </div>

        {/* ── Category pills ───────────────────────────────────────────────── */}
        <div className="flex gap-2 flex-wrap justify-center pb-7">
          <button
            onClick={() => handleCat("_all")}
            className="px-4 py-1.5 rounded-full text-[13px] font-medium border transition-all"
            style={
              selectedCat === "_all"
                ? { borderColor: "#d4af37", color: "#d4af37", background: "rgba(212,175,55,0.08)" }
                : { borderColor: "#1e293b", color: "#94a3b8" }
            }
          >
            All{" "}
            <span style={{ fontSize: 11, marginLeft: 2, color: selectedCat === "_all" ? "rgba(212,175,55,0.7)" : "#475569" }}>
              {posts.length}
            </span>
          </button>
          {categories.map((cat) => (
            <button
              key={cat._id}
              onClick={() => handleCat(cat._id)}
              className="px-4 py-1.5 rounded-full text-[13px] font-medium border transition-all"
              style={
                selectedCat === cat._id
                  ? { borderColor: "#d4af37", color: "#d4af37", background: "rgba(212,175,55,0.08)" }
                  : { borderColor: "#1e293b", color: "#94a3b8" }
              }
            >
              {cat.title}{" "}
              <span style={{ fontSize: 11, marginLeft: 2, color: selectedCat === cat._id ? "rgba(212,175,55,0.7)" : "#475569" }}>
                {catCountMap[cat._id] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* ── Sort row / Search banner ──────────────────────────────────────── */}
        <div className="flex justify-between items-center pb-5 border-b border-[#1e293b] mb-6">
          {isSearching ? (
            <div className="flex items-center gap-3 w-full">
              <span className="text-[13px] text-[#94a3b8]">
                <span className="text-white font-medium">{searchResults.length}</span>{" "}
                result{searchResults.length !== 1 ? "s" : ""} for{" "}
                <span className="text-[#d4af37] font-medium">&ldquo;{submittedQuery}&rdquo;</span>
              </span>
              <button
                onClick={clearSearch}
                className="flex items-center gap-1 text-[12px] text-[#64748b] hover:text-white transition ml-auto"
              >
                <X size={12} />
                Clear
              </button>
            </div>
          ) : (
            <>
              <span className="text-[13px] text-[#64748b]">
                {filtered.length} article{filtered.length !== 1 ? "s" : ""}
              </span>
              <select
                value={sort}
                onChange={(e) => handleSort(e.target.value)}
                className="py-1.5 px-3 rounded-lg border border-[#1e293b] bg-[#0f172a] text-[#94a3b8] text-[12px] outline-none cursor-pointer"
              >
                <option value="newest">Most recent</option>
                <option value="oldest">Oldest first</option>
              </select>
            </>
          )}
        </div>

        {/* ── Content + sidebar ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 mb-16">

          {/* Main column */}
          <div>
            <AnimatePresence mode="wait">
              {isSearching ? (
                /* ── Search results list view ── */
                <motion.div
                  key="search-results"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.25 }}
                >
                  {searchResults.length === 0 ? (
                    <div className="py-24 text-center">
                      <p className="text-[#64748b] text-sm mb-2">No results found for &ldquo;{submittedQuery}&rdquo;</p>
                      <p className="text-[#475569] text-xs">Try a different keyword or check the spelling</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {searchResults.map((post, i) => (
                        <motion.div
                          key={post._id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: i * 0.04 }}
                        >
                          <SearchResultCard post={post} />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                /* ── Normal grid view ── */
                <motion.div
                  key="grid-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {filtered.length === 0 ? (
                    <div className="py-24 text-center text-[#64748b] text-sm">No articles found.</div>
                  ) : (
                    <>
                      {featured && (
                        <motion.div
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4 }}
                          className="mb-7"
                        >
                          <FeaturedCard post={featured} />
                        </motion.div>
                      )}

                      {gridPosts.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-7">
                          {gridPosts.map((post, i) => (
                            <motion.div
                              key={post._id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: i * 0.05 }}
                              className="h-full"
                            >
                              <PostCard post={post} />
                            </motion.div>
                          ))}
                        </div>
                      )}

                      {hasMore && (
                        <div className="text-center py-4 pb-8">
                          <button
                            onClick={() => setVisibleCount((v) => v + 6)}
                            className="px-8 py-2.5 rounded-xl border border-[#1e293b] text-[#94a3b8] text-sm font-medium hover:border-[#d4af37] hover:text-[#d4af37] transition"
                          >
                            Load more articles
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-4">

              {trending.length > 0 && (
                <SidebarCard title="Trending this week">
                  <div className="space-y-0.5">
                    {trending.map((post, i) => {
                      const href = post.category
                        ? `/blog/${post.category.slug.current}/${post.slug.current}`
                        : "#";
                      return (
                        <Link
                          key={post._id}
                          href={href}
                          className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/[0.03] transition group"
                        >
                          <span
                            className="font-mono text-[20px] font-black leading-none shrink-0 group-hover:text-[#94a3b8] transition"
                            style={{ color: "#1e293b" }}
                          >
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <div>
                            <p className="text-[13px] font-medium text-[#e2e8f0] leading-snug line-clamp-2">
                              {post.title}
                            </p>
                            <p className="text-[11px] text-[#64748b] mt-0.5">
                              {formatDate(post.publishedAt)}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </SidebarCard>
              )}

              {authors.length > 0 && (
                <SidebarCard title="Authors">
                  <div className="space-y-0.5">
                    {authors.map((author) => (
                      <Link
                        key={author._id}
                        href={author.slug ? `/authors/${author.slug.current}` : "#"}
                        className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/[0.03] transition"
                      >
                        <Avatar src={author.image} name={author.name} size={32} />
                        <div>
                          <p className="text-[13px] font-medium text-[#e2e8f0]">{author.name}</p>
                          {author.jobTitle && (
                            <p className="text-[11px] text-[#64748b]">{author.jobTitle}</p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </SidebarCard>
              )}

              <SidebarSubscribe />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
