"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { Copy, Check, Globe, Github, Linkedin, Twitter, Mail } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EducationEntry {
  school: string; degree: string; field: string; from: string; to: string; description: string; hidden?: boolean;
}
interface ExperienceEntry {
  company: string; title: string; from: string; to: string; current: boolean; description: string; hidden?: boolean;
}
interface SkillEntry { name: string; level: string; hidden?: boolean; }
interface ReferenceEntry { name: string; role: string; company: string; email: string; hidden?: boolean; }
interface ProjectEntry { title: string; description: string; year: string; hidden?: boolean; }
interface CertificationEntry { title: string; issuer: string; year: string; hidden?: boolean; }
interface HonorEntry { title: string; description: string; hidden?: boolean; }

interface CV {
  name?: string; tagline?: string; bio?: string; location?: string;
  email?: string; phone?: string; website?: string;
  linkedin?: string; github?: string; twitter?: string; avatarUrl?: string;
  birthYear?: string;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  skills: SkillEntry[];
  references: ReferenceEntry[];
  languages: string[];
  projects: ProjectEntry[];
  certifications: CertificationEntry[];
  honors: HonorEntry[];
  sectionVisibility?: Record<string, boolean>;
}

interface HitBox {
  x1: number; x2: number; offset: number; amp: number; centerY: number;
  title: string; sub: string; desc: string; color: string; above: boolean;
}

interface PanelData {
  title: string; sub: string; desc: string; color: string; left: number; top: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseYear(s: string): number | null {
  if (!s) return null;
  const m = s.match(/\d{4}/);
  return m ? parseInt(m[0]) : null;
}

/** Parse "YYYY-MM" → decimal year (e.g. "2024-09" → 2024.667).
 *  Falls back to integer year for plain "YYYY" or legacy text dates. */
function parseDecimalYear(s: string): number | null {
  if (!s) return null;
  const ym = s.match(/^(\d{4})-(\d{2})$/);
  if (ym) return parseInt(ym[1]) + (parseInt(ym[2]) - 1) / 12;
  const y = s.match(/\d{4}/);
  return y ? parseInt(y[0]) : null;
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function formatMonthYear(s: string): string {
  if (!s) return "";
  const ym = s.match(/^(\d{4})-(\d{2})$/);
  if (ym) {
    const mon = MONTH_NAMES[parseInt(ym[2]) - 1] ?? "";
    return `${mon} ${ym[1]}`.trim();
  }
  return s;
}

function getInitials(name: string): string {
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function withProtocol(url: string): string {
  if (!url) return url;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fadeUp: any = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.08, ease: "easeOut" } }),
};

// ─── Wave Timeline (desktop canvas) ──────────────────────────────────────────

function WaveTimeline({
  education, experience, birthYear,
}: {
  education: EducationEntry[];
  experience: ExperienceEntry[];
  birthYear?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState<PanelData | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapEl = wrapRef.current;
    if (!canvas || !wrapEl) return;

    let W = 0, H = 0, DPR = 1;
    let animPhase = 0;
    let animId = 0;
    let hitboxes: HitBox[] = [];
    let labelBoxes: { x1: number; y1: number; x2: number; y2: number; hbIdx: number }[] = [];
    let needsResize = false;
    let hoveredHbIdx = -1;
    let activePanelIdx = -1;
    let resizeTimer: ReturnType<typeof setTimeout>;

    const GOLD = "#d4af37";
    const DARK = "#1e293b";
    const DIM = "#475569";
    const _d = new Date();
    const NOW = _d.getFullYear() + _d.getMonth() / 12;
    const NOW_INT = _d.getFullYear();
    const BIRTH = parseYear(birthYear || "") ?? (NOW_INT - 30);
    const CAR_COLORS = ["#1e5d8a", "#2477a8", "#3bb4a4"];

    const eduItems = education.map((e, i) => ({
      title: [e.degree, e.field].filter(Boolean).join(" · ") || "Degree",
      school: e.school,
      from: parseDecimalYear(e.from) ?? NOW,
      to: parseDecimalYear(e.to) ?? NOW,
      fromStr: formatMonthYear(e.from),
      toStr: formatMonthYear(e.to),
      color: i % 2 === 0 ? "#7c3aed" : "#a855f7",
      desc: e.description,
    }));

    const carItems = experience.map((e, i) => ({
      title: e.title,
      company: e.company,
      from: parseDecimalYear(e.from) ?? NOW,
      to: e.current ? NOW : (parseDecimalYear(e.to) ?? NOW),
      fromStr: formatMonthYear(e.from),
      toStr: e.current ? "Present" : formatMonthYear(e.to),
      current: e.current,
      color: CAR_COLORS[i % 3],
      desc: e.description,
    }));

    const allFromYears = [...eduItems.map((e) => e.from), ...carItems.map((c) => c.from)];
    const FIRST_EVENT = allFromYears.length > 0 ? Math.min(...allFromYears) : BIRTH + 18;
    const DISPLAY_END = NOW + 1;
    const COMPRESSED_GAP = 0.04;

    function yearToX(year: number): number {
      const pad = Math.max(16, W * 0.02);
      const usable = W - pad * 2;
      if (year <= FIRST_EVENT) {
        const range = FIRST_EVENT - BIRTH;
        const t = range > 0 ? (year - BIRTH) / range : 0;
        return pad + t * (usable * COMPRESSED_GAP);
      }
      const t = (year - FIRST_EVENT) / (DISPLAY_END - FIRST_EVENT);
      return pad + usable * COMPRESSED_GAP + t * (usable * (1 - COMPRESSED_GAP));
    }

    function waveY(x: number, offset: number, amp: number, centerY: number): number {
      const phase = W > 0 ? (x / W) * Math.PI * 2 * 3 + animPhase : 0;
      return centerY + Math.sin(phase) * amp + offset;
    }

    function setupCanvas() {
      DPR = window.devicePixelRatio || 1;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const containerW = wrapEl!.clientWidth;
      const h = Math.max(300, Math.min(520, containerW * 0.32));
      W = containerW;
      H = h;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      canvas!.style.width = W + "px";
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      canvas!.style.height = H + "px";
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      canvas!.width = W * DPR;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      canvas!.height = H * DPR;
    }

    function wavySeg(
      ctx: CanvasRenderingContext2D,
      x1: number, x2: number, offset: number,
      color: string, lw: number, glow: boolean,
      amp: number, centerY: number
    ) {
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.lineCap = "round";
      if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 8; }
      ctx.beginPath();
      for (let x = x1; x <= x2; x += 1) {
        const y = waveY(x, offset, amp, centerY);
        if (x === x1) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.lineTo(x2, waveY(x2, offset, amp, centerY));
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    function dot(
      ctx: CanvasRenderingContext2D,
      x: number, offset: number, color: string, r: number,
      amp: number, centerY: number
    ): { x: number; y: number } {
      const y = waveY(x, offset, amp, centerY);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      return { x, y };
    }

    function draw() {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const ctx = canvas!.getContext("2d")!;
      if (W === 0) return;

      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);
      hitboxes = [];
      labelBoxes = [];

      const amp = Math.max(16, Math.min(30, W * 0.022));
      const lineGap = Math.max(10, Math.min(14, W * 0.01));
      const centerY = H * 0.46;
      const fSm = Math.max(8, Math.min(10, W * 0.007)) + "px";
      const fMd = Math.max(9, Math.min(11, W * 0.008)) + "px";
      const fLb = Math.max(10, Math.min(12, W * 0.009)) + "px";
      const showLabels = W > 800;
      const stemH = Math.max(24, Math.min(40, H * 0.1));

      // Year ticks
      ctx.textAlign = "center";
      const axisEnd = Math.ceil(NOW);
      for (let yr = BIRTH; yr <= axisEnd; yr++) {
        if (yr > BIRTH && yr < FIRST_EVENT) continue;
        const distFromFirst = yr - Math.floor(FIRST_EVENT);
        if (yr > FIRST_EVENT && distFromFirst % 2 !== 0 && yr !== axisEnd) continue;
        const x = yearToX(yr);
        ctx.fillStyle = DIM;
        ctx.globalAlpha = 0.5;
        ctx.font = `${fSm} monospace`;
        ctx.fillText(String(yr), x, H - 6);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = DARK;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x, H - 18);
        ctx.lineTo(x, H - 22);
        ctx.stroke();
      }

      // Month sub-ticks for the active period (mid-year + quarters)
      const activeStart = Math.floor(FIRST_EVENT);
      for (let yr = activeStart; yr < axisEnd; yr++) {
        for (const m of [3, 6, 9]) {
          const dec = yr + m / 12;
          if (dec <= FIRST_EVENT || dec > NOW) continue;
          const x = yearToX(dec);
          const isMid = m === 6;
          ctx.strokeStyle = DIM;
          ctx.lineWidth = 0.5;
          ctx.globalAlpha = isMid ? 0.3 : 0.18;
          ctx.beginPath();
          ctx.moveTo(x, H - 18);
          ctx.lineTo(x, H - (isMid ? 21 : 20));
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      // Compression dots
      const cX1 = yearToX(BIRTH) + 20;
      const cX2 = yearToX(FIRST_EVENT) - 14;
      if (cX2 > cX1 + 10) {
        ctx.fillStyle = DIM;
        ctx.globalAlpha = 0.4;
        ctx.font = "14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("···", (cX1 + cX2) / 2, H - 10);
        ctx.globalAlpha = 1;
      }

      // Base dim lifeline
      const lx1 = yearToX(BIRTH);
      const lx2 = yearToX(NOW);
      wavySeg(ctx, lx1, W - 10, 0, DARK, 1.5, false, amp, centerY);

      // Gold active line
      const grad = ctx.createLinearGradient(lx1, 0, lx2, 0);
      grad.addColorStop(0, GOLD + "00");
      grad.addColorStop(0.06, GOLD + "88");
      grad.addColorStop(0.15, GOLD);
      grad.addColorStop(1, GOLD);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3;
      ctx.shadowColor = GOLD;
      ctx.shadowBlur = 10;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let x = lx1; x <= lx2; x += 1) {
        const y = waveY(x, 0, amp, centerY);
        if (x === lx1) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Born
      const birthPos = dot(ctx, lx1, 0, GOLD, Math.max(4, W * 0.004), amp, centerY);
      ctx.fillStyle = GOLD;
      ctx.font = `500 ${fSm} monospace`;
      ctx.textAlign = "center";
      ctx.fillText("Born " + BIRTH, birthPos.x, birthPos.y - 12);

      // Now
      const nowPos = dot(ctx, lx2, 0, GOLD, Math.max(5, W * 0.005), amp, centerY);
      ctx.font = `600 ${fMd} monospace`;
      ctx.fillStyle = GOLD;
      ctx.fillText("NOW", nowPos.x, nowPos.y - 14);

      // ── stem draw helpers (sh = resolved stem height, flip = draw text left) ─
      function stemUp(pos: { x: number; y: number }, color: string, title: string, sub: string, sh: number, flip: boolean, highlighted = false) {
        const topY = pos.y - sh;
        ctx.strokeStyle = highlighted ? color + "cc" : color + "66";
        ctx.lineWidth = highlighted ? 1.5 : 1;
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(pos.x, topY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = color;
        ctx.shadowColor = highlighted ? color : "transparent";
        ctx.shadowBlur = highlighted ? 8 : 0;
        ctx.beginPath();
        ctx.arc(pos.x, topY, highlighted ? 3 : 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        const tx = flip ? pos.x - 6 : pos.x + 6;
        ctx.textAlign = flip ? "right" : "left";
        ctx.fillStyle = highlighted ? "#ffffff" : color;
        ctx.font = `${highlighted ? "600" : "500"} ${fLb} sans-serif`;
        ctx.shadowColor = highlighted ? color : "transparent";
        ctx.shadowBlur = highlighted ? 10 : 0;
        ctx.fillText(title, tx, topY + 2);
        ctx.shadowBlur = 0;
        ctx.fillStyle = highlighted ? "#cbd5e1" : "#94a3b8";
        ctx.font = `${fSm} monospace`;
        ctx.fillText(sub, tx, topY - 10);
      }

      function stemDown(pos: { x: number; y: number }, color: string, title: string, sub: string, sh: number, flip: boolean, highlighted = false) {
        const botY = pos.y + sh;
        ctx.strokeStyle = highlighted ? color + "cc" : color + "66";
        ctx.lineWidth = highlighted ? 1.5 : 1;
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(pos.x, botY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = color;
        ctx.shadowColor = highlighted ? color : "transparent";
        ctx.shadowBlur = highlighted ? 8 : 0;
        ctx.beginPath();
        ctx.arc(pos.x, botY, highlighted ? 3 : 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        const tx = flip ? pos.x - 6 : pos.x + 6;
        ctx.textAlign = flip ? "right" : "left";
        ctx.fillStyle = highlighted ? "#ffffff" : color;
        ctx.font = `${highlighted ? "600" : "500"} ${fLb} sans-serif`;
        ctx.shadowColor = highlighted ? color : "transparent";
        ctx.shadowBlur = highlighted ? 10 : 0;
        ctx.fillText(title, tx, botY + 4);
        ctx.shadowBlur = 0;
        ctx.fillStyle = highlighted ? "#cbd5e1" : "#94a3b8";
        ctx.font = `${fSm} monospace`;
        ctx.fillText(sub, tx, botY + 16);
      }

      // ── Pass 1: draw segments/dots, collect pending labels ──────────────────
      type PLabel = {
        pos: { x: number; y: number }; color: string;
        title: string; sub: string; dir: "up" | "down"; sh: number; flip: boolean;
        x1: number; y1: number; x2: number; y2: number; hbIdx: number;
      };
      const pending: PLabel[] = [];

      const LINE_H = 14;
      const LABEL_H = LINE_H * 2 + 6;

      function labelBounds(pos: { x: number; y: number }, title: string, sub: string, dir: "up" | "down", sh: number) {
        ctx.font = `500 ${fLb} sans-serif`;
        const tw = ctx.measureText(title).width;
        ctx.font = `${fSm} monospace`;
        const sw = ctx.measureText(sub).width;
        const w = Math.max(tw, sw) + 16;
        // Flip to left side if text would overflow the right canvas edge
        const flip = pos.x + w + 6 > W - 4;
        const lx1 = flip ? pos.x - w : pos.x - 2;
        const lx2 = flip ? pos.x + 2 : pos.x + w;
        let ly1: number, ly2: number;
        if (dir === "up") {
          const topY = pos.y - sh;
          ly1 = topY - LINE_H - 4;
          ly2 = topY + LINE_H;
        } else {
          const botY = pos.y + sh;
          ly1 = botY;
          ly2 = botY + LABEL_H;
        }
        return { x1: lx1, y1: ly1, x2: lx2, y2: ly2, flip };
      }

      // Education — above
      eduItems.forEach((edu, i) => {
        const level = i % 2 === 0 ? 1 : 2;
        const offset = -(lineGap * level);
        const x1 = yearToX(edu.from);
        const x2 = yearToX(edu.to);
        wavySeg(ctx, x1, x2, offset, edu.color, 2.5, true, amp, centerY);
        dot(ctx, x1, offset, edu.color, Math.max(3, W * 0.003), amp, centerY);
        const endPos = dot(ctx, x2, offset, edu.color, Math.max(4, W * 0.0035), amp, centerY);
        const hbIdx = hitboxes.length;
        hitboxes.push({
          x1, x2, offset, amp, centerY,
          title: edu.title, sub: `${edu.school} · ${edu.fromStr}–${edu.toStr}`,
          desc: edu.desc, color: edu.color, above: true,
        });
        if (showLabels) {
          const b = labelBounds(endPos, edu.title, edu.school, "up", stemH);
          pending.push({ pos: endPos, color: edu.color, title: edu.title, sub: edu.school, dir: "up", sh: stemH, flip: b.flip, x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2, hbIdx });
        }
      });

      // Career — below
      carItems.forEach((job, i) => {
        const level = i % 2 === 0 ? 1 : 2;
        const offset = lineGap * level;
        const x1 = yearToX(job.from);
        const x2 = yearToX(job.current ? NOW : job.to);
        wavySeg(ctx, x1, x2, offset, job.color, 2.5, true, amp, centerY);
        dot(ctx, x1, offset, job.color, Math.max(3, W * 0.003), amp, centerY);
        const endPos = dot(ctx, x2, offset, job.color, Math.max(4, W * 0.0035), amp, centerY);
        const jobSub = job.company + (job.current ? " · Present" : "");
        const hbIdx = hitboxes.length;
        hitboxes.push({
          x1, x2, offset, amp, centerY,
          title: `${job.title} @ ${job.company}`,
          sub: `${job.fromStr} – ${job.toStr}`,
          desc: job.desc, color: job.color, above: false,
        });
        if (showLabels) {
          const b = labelBounds(endPos, job.title, jobSub, "down", stemH);
          pending.push({ pos: endPos, color: job.color, title: job.title, sub: jobSub, dir: "down", sh: stemH, flip: b.flip, x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2, hbIdx });
        }
      });

      // ── Highlight hovered / active segment ──────────────────────────────────
      const hlIdx = hoveredHbIdx !== -1 ? hoveredHbIdx : activePanelIdx;
      if (hlIdx !== -1) {
        const isEdu = hlIdx < eduItems.length;
        const item = isEdu ? eduItems[hlIdx] : carItems[hlIdx - eduItems.length];
        const itemI = isEdu ? hlIdx : hlIdx - eduItems.length;
        const level = itemI % 2 === 0 ? 1 : 2;
        const offset = isEdu ? -(lineGap * level) : lineGap * level;
        const hx1 = yearToX(item.from);
        const hx2 = isEdu
          ? yearToX((item as typeof eduItems[0]).to)
          : yearToX((item as typeof carItems[0]).current ? NOW : (item as typeof carItems[0]).to);
        // Wide glow pass
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 9;
        ctx.shadowColor = item.color;
        ctx.shadowBlur = 28;
        ctx.lineCap = "round";
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        for (let x = hx1; x <= hx2; x += 1) {
          const y = waveY(x, offset, amp, centerY);
          if (x === hx1) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
        // Bright line on top
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 2.5;
        ctx.shadowColor = item.color;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        for (let x = hx1; x <= hx2; x += 1) {
          const y = waveY(x, offset, amp, centerY);
          if (x === hx1) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // ── Pass 2: resolve collisions, then draw labels ─────────────────────────
      if (pending.length > 0) {
        const GAP = 5;
        function boxOverlap(a: PLabel, b: PLabel) {
          return !(a.x2 + GAP < b.x1 || b.x2 + GAP < a.x1 || a.y2 + GAP < b.y1 || b.y2 + GAP < a.y1);
        }
        // Sort left→right so leftmost labels claim space first
        pending.sort((a, b) => a.pos.x - b.pos.x);
        const placed: PLabel[] = [];
        for (const lbl of pending) {
          for (let attempt = 0; attempt < 25; attempt++) {
            if (!placed.some(p => boxOverlap(lbl, p))) break;
            lbl.sh += LINE_H;
            const nb = labelBounds(lbl.pos, lbl.title, lbl.sub, lbl.dir, lbl.sh);
            lbl.x1 = nb.x1; lbl.y1 = nb.y1; lbl.x2 = nb.x2; lbl.y2 = nb.y2; lbl.flip = nb.flip;
          }
          placed.push(lbl);
        }
        const hlIdx2 = hoveredHbIdx !== -1 ? hoveredHbIdx : activePanelIdx;
        for (const lbl of placed) {
          labelBoxes.push({ x1: lbl.x1, y1: lbl.y1, x2: lbl.x2, y2: lbl.y2, hbIdx: lbl.hbIdx });
          const hl = lbl.hbIdx === hlIdx2;
          if (lbl.dir === "up") stemUp(lbl.pos, lbl.color, lbl.title, lbl.sub, lbl.sh, lbl.flip, hl);
          else stemDown(lbl.pos, lbl.color, lbl.title, lbl.sub, lbl.sh, lbl.flip, hl);
        }
      }
    }

    function animate() {
      animPhase += 0.008;
      if (needsResize) { setupCanvas(); needsResize = false; }
      draw();
      animId = requestAnimationFrame(animate);
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const cvs = canvas!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const wrap = wrapEl!;

    function handleClick(e: MouseEvent) {
      const rect = cvs.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (W / rect.width);
      const my = (e.clientY - rect.top) * (H / rect.height);
      const amp = Math.max(16, Math.min(30, W * 0.022));
      const centerY = H * 0.46;

      function openHitbox(i: number) {
        activePanelIdx = i;
        const hb = hitboxes[i];
        const wrapRect = wrap.getBoundingClientRect();
        let left = e.clientX - wrapRect.left + 12;
        let top = e.clientY - wrapRect.top;
        if (left + 330 > wrap.clientWidth) left -= 350;
        if (left < 0) left = 8;
        if (hb.above) top += 10; else top -= 130;
        if (top < 0) top = 8;
        setPanel({ title: hb.title, sub: hb.sub, desc: hb.desc, color: hb.color, left, top });
      }

      // Check label boxes first (they're smaller, more precise targets)
      for (const lb of labelBoxes) {
        if (mx >= lb.x1 && mx <= lb.x2 && my >= lb.y1 && my <= lb.y2) {
          openHitbox(lb.hbIdx); return;
        }
      }
      // Then check wavy line hitboxes
      for (let i = 0; i < hitboxes.length; i++) {
        const hb = hitboxes[i];
        if (mx >= hb.x1 - 6 && mx <= hb.x2 + 6) {
          const ey = waveY(mx, hb.offset, amp, centerY);
          if (Math.abs(my - ey) < 20) { openHitbox(i); return; }
        }
      }
      activePanelIdx = -1;
      setPanel(null);
    }

    function handleMouseMove(e: MouseEvent) {
      const rect = cvs.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (W / rect.width);
      const my = (e.clientY - rect.top) * (H / rect.height);
      const amp = Math.max(16, Math.min(30, W * 0.022));
      const centerY = H * 0.46;
      let newIdx = -1;
      // Check label boxes first
      for (const lb of labelBoxes) {
        if (mx >= lb.x1 && mx <= lb.x2 && my >= lb.y1 && my <= lb.y2) {
          newIdx = lb.hbIdx; break;
        }
      }
      // Then check wavy lines
      if (newIdx === -1) {
        for (let i = 0; i < hitboxes.length; i++) {
          const hb = hitboxes[i];
          if (mx >= hb.x1 - 6 && mx <= hb.x2 + 6) {
            const ey = waveY(mx, hb.offset, amp, centerY);
            if (Math.abs(my - ey) < 20) { newIdx = i; break; }
          }
        }
      }
      hoveredHbIdx = newIdx;
      cvs.style.cursor = newIdx !== -1 ? "pointer" : "default";
    }

    function handleResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { setPanel(null); needsResize = true; }, 100);
    }

    setupCanvas();
    cvs.addEventListener("click", handleClick);
    cvs.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", handleResize);
    animate();

    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(resizeTimer);
      cvs.removeEventListener("click", handleClick);
      cvs.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
    };
  }, [education, experience, birthYear]);

  // Mobile vertical timeline
  const NOW_YEAR = new Date().getFullYear();
  const BIRTH_YEAR = parseYear(birthYear || "") ?? (NOW_YEAR - 30);
  const [mExpanded, setMExpanded] = useState<Set<string>>(new Set());
  function toggleM(id: string) {
    setMExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const mEduItems = education.map((e, i) => ({
    id: `edu-${i}`, date: formatMonthYear(e.from),
    title: [e.degree, e.field].filter(Boolean).join(" · ") || "Degree",
    sub: e.school, desc: e.description,
    color: i % 2 === 0 ? "#7c3aed" : "#a855f7",
  }));
  const mCarItems = experience.map((e, i) => ({
    id: `car-${i}`, date: formatMonthYear(e.from),
    title: e.title, sub: e.company, desc: e.description,
    color: ["#1e5d8a", "#2477a8", "#3bb4a4"][i % 3],
  }));

  return (
    <>
      {/* Desktop wave canvas */}
      <div ref={wrapRef} style={{ position: "relative", width: "100%" }} className="hidden sm:block">
        <canvas ref={canvasRef} style={{ display: "block", width: "100%" }} />
        {panel && (
          <div style={{
            position: "absolute", left: panel.left, top: panel.top,
            background: "#111827ee", border: `1px solid ${panel.color}44`,
            borderRadius: 12, padding: "18px 22px", zIndex: 50,
            boxShadow: "0 12px 40px rgba(0,0,0,0.5)", maxWidth: 320,
            backdropFilter: "blur(12px)",
          }}>
            <button
              onClick={() => setPanel(null)}
              style={{ position: "absolute", top: 8, right: 12, background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 18, lineHeight: 1 }}
            >×</button>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: panel.color, marginBottom: 3 }}>{panel.title}</h4>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: panel.desc ? 8 : 0 }}>{panel.sub}</div>
            {panel.desc && (
              <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.6, borderTop: "1px solid #1e293b", paddingTop: 8 }}>{panel.desc}</div>
            )}
          </div>
        )}
      </div>

      {/* Mobile vertical timeline */}
      <div className="sm:hidden">
        <div style={{ position: "relative", paddingLeft: 32, margin: "8px 0 24px" }}>
          <div style={{
            position: "absolute", left: 10, top: 0, bottom: 0, width: 3,
            background: "linear-gradient(to bottom, #d4af3700, #d4af37 8%, #d4af37)",
            borderRadius: 2, boxShadow: "0 0 8px rgba(212,175,55,0.3)",
          }} />

          {/* Born */}
          <div style={{ position: "relative", marginBottom: 28 }}>
            <div style={{ position: "absolute", left: -27, top: 4, width: 12, height: 12, borderRadius: "50%", background: "#d4af37", boxShadow: "0 0 8px rgba(212,175,55,0.5)", border: "2px solid #0a0e1a", zIndex: 2 }} />
            <div style={{ fontSize: 11, fontFamily: "monospace", color: "#64748b", marginBottom: 2 }}>{BIRTH_YEAR}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#d4af37" }}>Born</div>
          </div>

          {mEduItems.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 14, marginTop: 8, paddingLeft: 4, color: "#7c3aed" }}>Education</div>
              {mEduItems.map((item) => (
                <div key={item.id} style={{ position: "relative", marginBottom: 28, cursor: "pointer" }} onClick={() => toggleM(item.id)}>
                  <div style={{ position: "absolute", left: -27, top: 4, width: 12, height: 12, borderRadius: "50%", background: item.color, boxShadow: `0 0 6px ${item.color}66`, border: "2px solid #0a0e1a", zIndex: 2 }} />
                  <div style={{ fontSize: 11, fontFamily: "monospace", color: "#64748b", marginBottom: 2 }}>{item.date}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#f8fafc" }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 1 }}>{item.sub}</div>
                  {mExpanded.has(item.id) && item.desc && (
                    <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 6, lineHeight: 1.5 }}>{item.desc}</div>
                  )}
                </div>
              ))}
            </>
          )}

          {mCarItems.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 14, marginTop: 8, paddingLeft: 4, color: "#3bb4a4" }}>Career</div>
              {mCarItems.map((item) => (
                <div key={item.id} style={{ position: "relative", marginBottom: 28, cursor: "pointer" }} onClick={() => toggleM(item.id)}>
                  <div style={{ position: "absolute", left: -27, top: 4, width: 12, height: 12, borderRadius: "50%", background: item.color, boxShadow: `0 0 6px ${item.color}66`, border: "2px solid #0a0e1a", zIndex: 2 }} />
                  <div style={{ fontSize: 11, fontFamily: "monospace", color: "#64748b", marginBottom: 2 }}>{item.date}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#f8fafc" }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 1 }}>{item.sub}</div>
                  {mExpanded.has(item.id) && item.desc && (
                    <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 6, lineHeight: 1.5 }}>{item.desc}</div>
                  )}
                </div>
              ))}
            </>
          )}

          {/* Now */}
          <div style={{ position: "relative", marginBottom: 28 }}>
            <div style={{ position: "absolute", left: -27, top: 4, width: 12, height: 12, borderRadius: "50%", background: "#d4af37", boxShadow: "0 0 8px rgba(212,175,55,0.5)", border: "2px solid #0a0e1a", zIndex: 2 }} />
            <div style={{ fontSize: 11, fontFamily: "monospace", color: "#64748b", marginBottom: 2 }}>{NOW_YEAR}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#d4af37" }}>Now</div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CVPublicView({ cv }: { cv: CV }) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const initials = cv.name ? getInitials(cv.name) : "?";

  const sv = cv.sectionVisibility ?? {};
  const secVisible = (k: string) => sv[k] !== false;

  const socialLinks = secVisible("socials") ? [
    cv.linkedin && { href: withProtocol(cv.linkedin), icon: Linkedin, title: "LinkedIn" },
    cv.github && { href: withProtocol(cv.github), icon: Github, title: "GitHub" },
    cv.twitter && { href: withProtocol(cv.twitter), icon: Twitter, title: "Twitter / X" },
    cv.website && { href: withProtocol(cv.website), icon: Globe, title: "Website" },
    cv.email && { href: `mailto:${cv.email}`, icon: Mail, title: "Email" },
  ].filter(Boolean) as { href: string; icon: React.ElementType; title: string }[] : [];

  const edu = secVisible("education") ? (cv.education ?? []).filter((e) => !e.hidden) : [];
  const exp = secVisible("experience") ? (cv.experience ?? []).filter((e) => !e.hidden) : [];
  const skills = secVisible("skills") ? (cv.skills ?? []).filter((s) => !s.hidden) : [];
  const langs = secVisible("languages") ? (cv.languages ?? []) : [];
  const projects = secVisible("projects") ? (cv.projects ?? []).filter((p) => !p.hidden) : [];
  const certifications = secVisible("certifications") ? (cv.certifications ?? []).filter((c) => !c.hidden) : [];
  const honors = secVisible("honors") ? (cv.honors ?? []).filter((h) => !h.hidden) : [];
  const references = secVisible("references") ? (cv.references ?? []).filter((r) => !r.hidden) : [];

  const showBio = secVisible("about") && Boolean(cv.bio);
  const hasBottom = projects.length > 0 || certifications.length > 0 || honors.length > 0 || references.length > 0;
  const hasTimeline = edu.length > 0 || exp.length > 0 || cv.birthYear;

  return (
    <div style={{ background: "#0a0e1a", color: "#e2e8f0", fontFamily: "Inter, sans-serif", minHeight: "100vh" }}>
      {/* Gold top border */}
      <div style={{ height: 4, background: "linear-gradient(to right, transparent, #d4af37, transparent)" }} />

      <div style={{ padding: "32px clamp(16px, 4vw, 60px) 60px", maxWidth: 1600, margin: "0 auto" }}>

        {/* ── Top row: header + bio ── */}
        <motion.div
          style={{ display: "flex", gap: 32, marginBottom: 28, alignItems: "flex-start", flexWrap: "wrap" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexShrink: 0 }}>
            {/* Avatar */}
            <div style={{
              width: "clamp(64px, 10vw, 90px)", height: "clamp(64px, 10vw, 90px)",
              borderRadius: "50%",
              background: cv.avatarUrl ? undefined : "linear-gradient(135deg, #d4af37 0%, #1e5d8a 100%)",
              border: "3px solid #d4af37",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 700, color: "#0a0e1a",
              flexShrink: 0, overflow: "hidden",
            }}>
              {cv.avatarUrl
                ? <img src={cv.avatarUrl} alt={cv.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : initials}
            </div>

            {/* Info */}
            <div>
              <h1 style={{ fontSize: "clamp(20px, 3.5vw, 28px)", fontWeight: 700, color: "#f8fafc" }}>
                {cv.name || "Anonymous"}
              </h1>
              {cv.tagline && (
                <div style={{ fontSize: "clamp(12px, 1.5vw, 14px)", color: "#94a3b8", marginTop: 3 }}>{cv.tagline}</div>
              )}
              {cv.location && (
                <div style={{ fontSize: "clamp(11px, 1.3vw, 12px)", color: "#64748b", marginTop: 4 }}>● {cv.location}</div>
              )}
              {/* Socials */}
              {socialLinks.length > 0 && (
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  {socialLinks.map(({ href, icon: Icon, title }) => (
                    <a
                      key={title}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={title}
                      style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#94a3b8", textDecoration: "none", transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "rgba(212,175,55,0.15)";
                        (e.currentTarget as HTMLElement).style.borderColor = "#d4af37";
                        (e.currentTarget as HTMLElement).style.color = "#d4af37";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
                        (e.currentTarget as HTMLElement).style.color = "#94a3b8";
                      }}
                    >
                      <Icon size={14} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bio box */}
          {showBio && (
            <div style={{
              flex: 1, minWidth: 240,
              background: "rgba(255,255,255,0.03)", border: "1px solid #1e293b",
              borderRadius: 12, padding: "18px 22px",
              maxHeight: 140, overflowY: "auto",
            }}>
              <h3 style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "1.2px", color: "#475569", marginBottom: 8 }}>
                About
              </h3>
              <p style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.65 }}>{cv.bio}</p>
            </div>
          )}
        </motion.div>

        {/* ── Wave Timeline ── */}
        {hasTimeline && (
          <WaveTimeline
            education={edu}
            experience={exp}
            birthYear={cv.birthYear}
          />
        )}

        {/* ── Skills + Languages ── */}
        {(skills.length > 0 || langs.length > 0) && (
          <motion.div
            style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid #1e293b", display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            {skills.length > 0 && (
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "1.2px", color: "#475569", marginBottom: 12 }}>Skills</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {skills.map((skill, i) => {
                    const colors =
                      skill.level === "expert" ? { bg: "rgba(212,175,55,0.15)", color: "#d4af37", border: "rgba(212,175,55,0.25)" }
                      : skill.level === "intermediate" ? { bg: "rgba(59,180,164,0.12)", color: "#3bb4a4", border: "rgba(59,180,164,0.2)" }
                      : { bg: "rgba(30,93,138,0.15)", color: "#5ba3d9", border: "rgba(30,93,138,0.25)" };
                    return (
                      <span key={i} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 500, background: colors.bg, color: colors.color, border: `1px solid ${colors.border}`, transition: "all 0.2s" }}>
                        {skill.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {langs.length > 0 && (
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "1.2px", color: "#475569", marginBottom: 12 }}>Languages</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {langs.map((lang, i) => (
                    <div key={i} style={{ padding: "5px 12px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid #1e293b", fontSize: 12, fontWeight: 500, color: "#e2e8f0" }}>
                      {lang}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Bottom grid ── */}
        {hasBottom && (
          <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px 28px" }}>

            {projects.length > 0 && (
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <h3 style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "1.2px", color: "#475569", marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid #1e293b" }}>Projects</h3>
                {projects.map((p, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#e2e8f0" }}>{p.title}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{[p.description, p.year].filter(Boolean).join(" · ")}</div>
                  </div>
                ))}
              </motion.div>
            )}

            {certifications.length > 0 && (
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp}>
                <h3 style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "1.2px", color: "#475569", marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid #1e293b" }}>Certifications</h3>
                {certifications.map((c, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, color: "#d4af37" }}>◆</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#e2e8f0" }}>{c.title}</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>{[c.issuer, c.year].filter(Boolean).join(" · ")}</div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {honors.length > 0 && (
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={2} variants={fadeUp}>
                <h3 style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "1.2px", color: "#475569", marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid #1e293b" }}>Honors & Publications</h3>
                {honors.map((h, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#e2e8f0" }}>{h.title}</div>
                    {h.description && <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{h.description}</div>}
                  </div>
                ))}
              </motion.div>
            )}

            {references.length > 0 && (
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={3} variants={fadeUp}>
                <h3 style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "1.2px", color: "#475569", marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid #1e293b" }}>References</h3>
                {references.map((r, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#e2e8f0" }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: "#d4af37", marginTop: 1 }}>{r.role}</div>
                    {r.company && <div style={{ fontSize: 11, color: "#64748b" }}>{r.company}</div>}
                    {r.email && <a href={`mailto:${r.email}`} style={{ fontSize: 11, color: "#64748b", textDecoration: "none" }}>{r.email}</a>}
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ maxWidth: 1600, margin: "0 auto", padding: "20px clamp(16px, 4vw, 60px)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <Link href="/" style={{ color: "#64748b", textDecoration: "none", fontSize: 13 }}>
            Hosted on <span style={{ color: "#d4af37" }}>NeuroNomixer</span>
          </Link>
          <button
            onClick={copyLink}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#94a3b8", cursor: "pointer", fontSize: 12, transition: "all 0.2s" }}
          >
            {copied ? <Check size={13} color="#4ade80" /> : <Copy size={13} />}
            {copied ? "Link copied!" : "Copy link"}
          </button>
        </div>
      </div>
    </div>
  );
}
