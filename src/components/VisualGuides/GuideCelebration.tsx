"use client";

import { useEffect, useState, useRef } from "react";

interface Particle {
  id: number;
  x: number;       // % from left
  delay: number;   // s
  duration: number;// s
  size: number;    // px
  color: string;
  rotation: number;// deg
  shape: "rect" | "circle" | "diamond";
}

const COLORS = [
  "#d4af37", "#d4af37", "#f0d060",  // gold (weighted)
  "#3bb4a4", "#22c55e",              // teal / green
  "#3b82f6", "#818cf8",              // blue / indigo
  "#f472b6", "#e2e8f0",              // pink / white
];

function makeParticles(count: number): Particle[] {
  const shapes: Particle["shape"][] = ["rect", "circle", "diamond"];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 1.2,
    duration: 2.2 + Math.random() * 1.6,
    size: 6 + Math.random() * 8,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: Math.random() * 360,
    shape: shapes[Math.floor(Math.random() * shapes.length)],
  }));
}

const PARTICLES = makeParticles(80);

interface Props {
  show: boolean;
  saved?: boolean;
}

export default function GuideCelebration({ show, saved = true }: Props) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (show && !visible) {
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), 4000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-40px) rotate(var(--rot)); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(110vh) rotate(calc(var(--rot) + 540deg)); opacity: 0; }
        }
        @keyframes celebFadeIn {
          from { opacity: 0; transform: scale(0.7); }
          60%  { transform: scale(1.06); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes celebFadeOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        .celeb-badge {
          animation: celebFadeIn 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards,
                     celebFadeOut 0.5s ease 3.2s forwards;
        }
        .celeb-overlay {
          animation: celebFadeOut 0.4s ease 3.6s forwards;
        }
      `}</style>

      {/* Full-screen overlay — pointer-events:none so user can still interact */}
      <div
        className="celeb-overlay fixed inset-0 z-[9999] overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        {/* Confetti particles */}
        {PARTICLES.map((p) => (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: 0,
              width: p.size,
              height: p.shape === "rect" ? p.size * 0.5 : p.size,
              backgroundColor: p.color,
              borderRadius: p.shape === "circle" ? "50%" : p.shape === "diamond" ? "0" : "2px",
              transform: p.shape === "diamond" ? "rotate(45deg)" : undefined,
              "--rot": `${p.rotation}deg`,
              animationName: "confettiFall",
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              animationTimingFunction: "linear",
              animationFillMode: "both",
              opacity: 0,
            } as React.CSSProperties}
          />
        ))}

        {/* Central badge */}
        <div className="celeb-badge absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-[#0a0e1a]/90 border-2 border-[#d4af37] rounded-3xl px-10 py-7 text-center shadow-[0_0_60px_rgba(212,175,55,0.4)] backdrop-blur-sm">
            <div className="text-5xl mb-3">🎉</div>
            <p className="text-[#d4af37] text-[11px] font-semibold uppercase tracking-[3px] mb-1">
              Guide Complete
            </p>
            <p className="text-white text-2xl font-black">Well done!</p>
            <p className="text-[#94a3b8] text-[13px] mt-1">
              {saved ? "Your progress has been saved." : "Sign up to save your progress!"}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
