"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
  { href: "/authors", label: "Authors" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy Policy" },
];

const SOCIAL_LINKS = [
  {
    href: "mailto:saeid.sheikhi@neuronomixer.com",
    title: "Email",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px]">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
  },
  {
    href: "https://www.linkedin.com/in/saeid-sheikhi-aa2110149/",
    title: "LinkedIn",
    external: true,
    icon: (
      <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="currentColor">
        <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.25 6.5 1.75 1.75 0 016.5 8.25zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z" />
      </svg>
    ),
  },
  {
    href: "https://github.com/saeidparvaz30-commits",
    title: "GitHub",
    external: true,
    icon: (
      <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="currentColor">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    ),
  },
  {
    href: "https://x.com/SaeidSheikhi_",
    title: "X",
    external: true,
    icon: (
      <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
];

function FooterCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const DPR = window.devicePixelRatio || 1;
    const PARTICLE_COUNT = 30;
    const CONNECTION_DIST = 120;
    const SPEED = 0.18;
    type Particle = { x: number; y: number; vx: number; vy: number; r: number; brightness: number; pulse: number };
    let W = 0, H = 0;
    let ctx: CanvasRenderingContext2D | null = null;
    let rafId = 0;
    let time = 0;
    const particles: Particle[] = [];

    function resize() {
      if (!canvas) return;
      const rect = canvas.parentElement!.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(DPR, DPR);
    }

    resize();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * SPEED, vy: (Math.random() - 0.5) * SPEED,
        r: Math.random() * 1.2 + 0.4,
        brightness: Math.random() * 0.15 + 0.04,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    function drawFrame() {
      if (!ctx) return;
      time += 0.01;
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
            const alpha = (1 - dist / CONNECTION_DIST) * 0.07;
            ctx.strokeStyle = (i + j) % 3 !== 0
              ? `rgba(212,175,55,${alpha})`
              : `rgba(59,180,164,${alpha * 0.6})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      for (const p of particles) {
        const pulse = Math.sin(time * 2 + p.pulse) * 0.3 + 0.7;
        const alpha = p.brightness * pulse;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        grad.addColorStop(0, `rgba(212,175,55,${alpha * 0.5})`);
        grad.addColorStop(1, `rgba(212,175,55,0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(212,175,55,${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function loop() {
      drawFrame();
      rafId = requestAnimationFrame(loop);
    }

    function start() {
      cancelAnimationFrame(rafId);
      if (reducedMotion.matches) {
        drawFrame(); // single static frame, no animation
      } else if (!document.hidden) {
        loop();
      }
    }

    function onVisibilityChange() {
      if (document.hidden) {
        cancelAnimationFrame(rafId);
      } else {
        start();
      }
    }

    start();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibilityChange);
    reducedMotion.addEventListener("change", start);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      reducedMotion.removeEventListener("change", start);
    };
  }, []);

  return (
    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }} />
  );
}

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-[#1e293b]" style={{ padding: "56px clamp(20px,5vw,60px) 32px" }}>

      {/* Animated glow line */}
      <div className="absolute top-[-1px] left-0 w-full h-[2px] opacity-60 pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent 0%, #d4af37 30%, #3bb4a4 50%, #d4af37 70%, transparent 100%)",
          backgroundSize: "200% 100%",
          animation: "footerGlowSlide 4s ease-in-out infinite",
        }}
      />

      <FooterCanvas />

      <div className="relative z-[2] max-w-[1200px] mx-auto flex gap-12 items-start flex-col sm:flex-row sm:items-start"
        style={{ flexWrap: "nowrap" }}
      >

        {/* Logo ring */}
        <div className="shrink-0 mx-auto sm:mx-0" style={{ animation: "footerLogoFloat 5s ease-in-out infinite" }}>
          <div className="relative w-[112px] h-[112px] rounded-full flex items-center justify-center"
            style={{
              border: "2px solid rgba(212,175,55,0.5)",
              background: "rgba(212,175,55,0.03)",
            }}
          >
            {/* Orbit ring */}
            <div className="absolute inset-[-7px] rounded-full pointer-events-none"
              style={{
                border: "1px solid transparent",
                borderTopColor: "#d4af37",
                borderRightColor: "rgba(59,180,164,0.4)",
                animation: "footerOrbitSpin 8s linear infinite",
                opacity: 0.5,
              }}
            />
            <Image
              src="/pictures/Logo.png"
              alt="NeuroNomixer logo"
              width={106}
              height={106}
              className="rounded-full object-contain"
              sizes="106px"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex-1 flex flex-col gap-5 text-center sm:text-left">

          {/* Nav links */}
          <nav className="flex gap-6 flex-wrap justify-center sm:justify-start">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-[13px] font-medium text-[#94a3b8] transition-colors duration-200 hover:text-[#d4af37] relative group"
              >
                {label}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-[#d4af37] transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </nav>

          {/* Social icons */}
          <div className="flex gap-3 justify-center sm:justify-start">
            {SOCIAL_LINKS.map(({ href, title, icon, external }) => (
              <a
                key={title}
                href={href}
                title={title}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="w-[34px] h-[34px] rounded-lg border border-[#1e293b] flex items-center justify-center text-[#64748b] transition-all duration-300 hover:border-[#d4af37] hover:text-[#d4af37] hover:-translate-y-[3px] hover:shadow-[0_4px_16px_rgba(212,175,55,0.15)]"
              >
                {icon}
              </a>
            ))}
          </div>

          {/* Divider */}
          <div className="h-px w-full" style={{ background: "linear-gradient(90deg, #1e293b 0%, rgba(212,175,55,0.15) 50%, #1e293b 100%)" }} />

          {/* Copyright */}
          <p className="text-[11px] text-[#64748b]">
            © 2026 NeuroNomixer — Built with Next.js &amp; Tailwind CSS
          </p>
        </div>

      </div>

      <style>{`
        @keyframes footerGlowSlide {
          0%, 100% { background-position: 200% 0; }
          50% { background-position: -200% 0; }
        }
        @keyframes footerLogoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes footerOrbitSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </footer>
  );
}
