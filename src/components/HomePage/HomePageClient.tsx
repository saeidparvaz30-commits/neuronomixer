"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useSession } from "next-auth/react";
import SignUpModal from "@/components/appSkeleton/SignUpModal";

// ─── Types ────────────────────────────────────────────────────────────────────

type Post = {
  _id: string;
  title: string;
  slug: { current: string };
  description?: string;
  publishedAt?: string;
  mainImage?: string;
  featured?: boolean;
  heroOrder?: number | null;
  category?: { _id: string; title: string; slug: { current: string } };
  author?: {
    _id: string;
    name: string;
    slug?: { current: string };
    image?: string;
    jobTitle?: string;
  };
};

type Category = {
  _id: string;
  title: string;
  slug: { current: string };
  description?: string;
  image?: string;
  postCount?: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
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

// ─── Neural Background ────────────────────────────────────────────────────────

function NeuralBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const DPR = window.devicePixelRatio || 1;
    const PARTICLE_COUNT = 50;
    const CONNECTION_DIST = 140;
    const SPEED = 0.22;
    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      brightness: number;
    };
    let W = 0,
      H = 0;
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
        brightness: Math.random() * 0.2 + 0.06,
      });
    }

    function animate() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            ctx.strokeStyle = `rgba(212,175,55,${(1 - dist / CONNECTION_DIST) * 0.08})`;
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

function Avatar({
  src,
  name,
  size = 22,
}: {
  src?: string;
  name: string;
  size?: number;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
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

// ─── Hero Slideshow ───────────────────────────────────────────────────────────

function HeroSlideshow({ posts }: { posts: Post[] }) {
  const [current, setCurrent] = useState(0);
  const total = posts.length;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function goTo(idx: number) {
    setCurrent(((idx % total) + total) % total);
  }

  function resetTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(
      () => setCurrent((c) => (c + 1) % total),
      5000,
    );
  }

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  if (total === 0) return null;

  const prevIdx = (current - 1 + total) % total;
  const nextIdx = (current + 1) % total;

  function getAnimate(i: number) {
    if (i === current) return { opacity: 1, scale: 1, x: 0, zIndex: 3 };
    if (i === prevIdx) return { opacity: 0.28, scale: 0.88, x: -44, zIndex: 1 };
    if (i === nextIdx) return { opacity: 0.28, scale: 0.88, x: 44, zIndex: 1 };
    return { opacity: 0, scale: 0.92, x: 0, zIndex: 0 };
  }

  return (
    <div
      className="relative w-full max-w-[620px]"
      style={{ aspectRatio: "4/3" }}
    >
      {posts.map((post, i) => {
        const isActive = i === current;
        const href = post.category
          ? `/blog/${post.category.slug.current}/${post.slug.current}`
          : "/blog";

        return (
          <motion.div
            key={post._id}
            animate={getAnimate(i)}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0 rounded-2xl overflow-hidden border border-[#1e293b]"
            style={{ cursor: "pointer" }}
          >
            <Link
              href={isActive ? href : "#"}
              onClick={(e) => {
                if (!isActive) {
                  e.preventDefault();
                  goTo(i);
                  resetTimer();
                }
              }}
              className="absolute inset-0 block"
            >
              {post.mainImage ? (
                <Image
                  src={post.mainImage}
                  alt={post.title}
                  fill
                  sizes="100vw"
                  priority
                  className="object-cover"
                  style={{ transition: "transform 0.6s" }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#1e5d8a]/40 to-[#0f172a]" />
              )}
              <div
                className="absolute bottom-0 left-0 right-0 p-7"
                style={{
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 60%, transparent 100%)",
                }}
              >
                {post.category && (
                  <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[#d4af37] mb-2">
                    {post.category.title}
                  </p>
                )}
                <h3 className="text-[19px] font-bold text-white leading-[1.3] mb-2 line-clamp-2">
                  {post.title}
                </h3>
                {post.description && (
                  <p className="text-[12px] text-white/65 leading-[1.5] line-clamp-2">
                    {post.description}
                  </p>
                )}
              </div>
            </Link>
          </motion.div>
        );
      })}

      {/* Progress indicators */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {posts.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              goTo(i);
              resetTimer();
            }}
            className="relative overflow-hidden rounded-sm"
            style={{ width: 32, height: 3, background: "#1e293b" }}
            aria-label={`Go to slide ${i + 1}`}
          >
            {i === current && (
              <motion.span
                key={current}
                className="absolute inset-y-0 left-0 rounded-sm"
                style={{ background: "#d4af37" }}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 5, ease: "linear" }}
              />
            )}
            {i < current && (
              <span
                className="absolute inset-0 rounded-sm"
                style={{ background: "rgba(212,175,55,0.4)" }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({ post }: { post: Post }) {
  const href = post.category
    ? `/blog/${post.category.slug.current}/${post.slug.current}`
    : "/blog";
  return (
    <Link
      href={href}
      className="group flex flex-col border border-[#1e293b] rounded-2xl overflow-hidden bg-[#0f172a] hover:border-[#334155] hover:-translate-y-[3px] transition-all duration-200 h-full"
    >
      <div className="relative h-[150px] overflow-hidden bg-gradient-to-br from-[#1e293b] to-[#0f172a]">
        {post.mainImage ? (
          <Image
            src={post.mainImage}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover group-hover:scale-[1.05] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1e5d8a]/20 to-[#1e293b]" />
        )}
      </div>
      <div className="p-[18px] flex flex-col flex-1">
        {post.category && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#d4af37] mb-2">
            {post.category.title}
          </p>
        )}
        <h3 className="text-[15px] font-semibold text-white leading-[1.35] mb-2 line-clamp-2 flex-1">
          {post.title}
        </h3>
        {post.description && (
          <p className="text-[12px] text-[#94a3b8] leading-[1.5] line-clamp-2 mb-3">
            {post.description}
          </p>
        )}
        <div className="flex items-center gap-2 text-[11px] text-[#64748b] mt-auto">
          {post.author && (
            <Avatar src={post.author.image} name={post.author.name} size={20} />
          )}
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

// ─── Newsletter ───────────────────────────────────────────────────────────────

function NewsletterSection() {
  const { data: session, status } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isLoggedIn = status === "authenticated" && !!session;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl p-10 md:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 border"
        style={{
          background: "linear-gradient(135deg, rgba(212,175,55,0.06), rgba(30,93,138,0.08))",
          borderColor: "rgba(212,175,55,0.15)",
        }}
      >
        <div className="flex-1">
          <h2 className="text-[24px] font-bold text-white mb-2">
            Stay in the loop
          </h2>
          <p className="text-[14px] text-[#94a3b8] leading-relaxed max-w-[400px]">
            {isLoggedIn
              ? "You're already part of the NeuroNomixer community. Head to your dashboard to manage your feed."
              : "Join the community to get curated insights, follow your favourite authors, and personalise your reading feed."}
          </p>
        </div>

        {isLoggedIn ? (
          <Link
            href="/dashboard"
            className="px-8 py-3 rounded-xl bg-[#d4af37] text-[#0a0e1a] text-[14px] font-semibold hover:opacity-90 transition whitespace-nowrap shrink-0"
          >
            Go to Dashboard
          </Link>
        ) : (
          <div className="flex flex-col items-start sm:items-center gap-2 shrink-0 w-full md:w-auto">
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#d4af37] text-[#0a0e1a] text-[14px] font-semibold hover:opacity-90 transition whitespace-nowrap"
            >
              Create a Free Account
            </button>
            <p className="text-[12px] text-[#475569]">
              Already have an account?{" "}
              <Link href="/auth/sign-in" className="text-[#d4af37]/80 hover:text-[#d4af37]">
                Sign in
              </Link>
            </p>
          </div>
        )}
      </motion.div>
      <SignUpModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  linkLabel,
  linkHref,
}: {
  title: string;
  linkLabel: string;
  linkHref: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="flex justify-between items-end mb-8"
    >
      <h2 className="text-[clamp(22px,3vw,30px)] font-extrabold tracking-[-0.5px] text-white">
        {title}
      </h2>
      <Link
        href={linkHref}
        className="flex items-center gap-1 text-[13px] font-medium text-[#d4af37] transition-all hover:gap-2"
      >
        {linkLabel} <ArrowRight size={13} />
      </Link>
    </motion.div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function HomePageClient({
  heroPosts,
  latestPosts,
  categories,
}: {
  heroPosts: Post[];
  latestPosts: Post[];
  categories: Category[];
}) {
  // Deduplicate: remove hero posts from latest list
  const heroIds = useMemo(() => new Set(heroPosts.map((p) => p._id)), [heroPosts]);
  const visibleLatest = useMemo(
    () => latestPosts.filter((p) => !heroIds.has(p._id)).slice(0, 3),
    [latestPosts, heroIds],
  );

  return (
    <>
      <NeuralBackground />
      <div className="relative z-[1]">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 pt-16 lg:pt-10 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: branding */}
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-px bg-[#d4af37] shrink-0" />
                <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#d4af37]">
                  AI · Data · Risk Analytics
                </span>
              </div>

              <h1
                className="font-black leading-[1.08] tracking-[-1.5px] text-white mb-5"
                style={{ fontSize: "clamp(36px,5vw,56px)" }}
              >
                Where <span className="text-[#d4af37]">Data</span> Meets
                <br />
                <span className="text-[#3bb4a4]">Intelligence</span>
              </h1>

              <p className="text-[16px] text-[#94a3b8] leading-[1.7] max-w-[460px] mb-8">
                Exploring the intersection of artificial intelligence, data
                science, and risk analytics through in-depth articles, research,
                and engineering insights.
              </p>

              <div className="flex gap-3 flex-wrap">
                <Link
                  href="/blog"
                  className="px-7 py-3 rounded-xl bg-[#d4af37] text-[#0a0e1a] text-[14px] font-semibold hover:opacity-90 transition shadow-[0_4px_20px_rgba(212,175,55,0.2)] hover:shadow-[0_6px_30px_rgba(212,175,55,0.35)] hover:-translate-y-[1px]"
                >
                  Explore the Blog
                </Link>
                <Link
                  href="/authors"
                  className="px-7 py-3 rounded-xl border border-[#1e293b] text-[14px] font-medium text-white hover:border-[#d4af37] hover:text-[#d4af37] transition"
                >
                  Meet the Authors
                </Link>
              </div>
            </motion.div>

            {/* Right: slideshow */}
            {heroPosts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.65, delay: 0.15 }}
                className="flex justify-center lg:justify-end pb-10"
              >
                <HeroSlideshow posts={heroPosts} />
              </motion.div>
            )}
          </div>
        </section>

        {/* ── Explore Topics ───────────────────────────────────────────── */}
        {categories.length > 0 && (
          <section className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 pb-20">
            <SectionHeader
              title="Explore Topics"
              linkLabel="View all categories"
              linkHref="/blog"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat, i) => (
                <motion.div
                  key={cat._id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                >
                  <Link
                    href={`/blog?cat=${cat.slug.current}`}
                    className="group relative block rounded-2xl overflow-hidden border border-[#1e293b] hover:border-[#d4af37]/30 hover:-translate-y-[3px] transition-all duration-300"
                    style={{ height: 200 }}
                  >
                    {cat.image ? (
                      <Image
                        src={cat.image}
                        alt={cat.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 25vw"
                        className="object-cover group-hover:scale-[1.05] transition-transform duration-500"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#1e5d8a]/40 to-[#0f172a]" />
                    )}
                    <div
                      className="absolute inset-0 flex flex-col justify-end p-6"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(10,14,26,0.88), rgba(10,14,26,0.55))",
                      }}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[1px] text-[#d4af37] mb-1.5">
                        {cat.postCount ?? 0} article
                        {(cat.postCount ?? 0) !== 1 ? "s" : ""}
                      </p>
                      <h3 className="text-[20px] font-bold text-white mb-1.5">
                        {cat.title}
                      </h3>
                      {cat.description && (
                        <p className="text-[12px] text-[#94a3b8] leading-[1.5] line-clamp-2">
                          {cat.description}
                        </p>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ── Latest Articles ──────────────────────────────────────────── */}
        {visibleLatest.length > 0 && (
          <section className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 pb-20">
            <SectionHeader
              title="Latest Articles"
              linkLabel="View all"
              linkHref="/blog"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {visibleLatest.map((post, i) => (
                <motion.div
                  key={post._id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="h-full"
                >
                  <PostCard post={post} />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ── Newsletter ───────────────────────────────────────────────── */}
        <section className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 pb-20">
          <NewsletterSection />
        </section>
      </div>
    </>
  );
}
