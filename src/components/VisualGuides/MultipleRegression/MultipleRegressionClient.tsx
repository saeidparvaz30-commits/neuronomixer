"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  ICE_CREAM_DATA,
  fitSimpleRegression,
  fitMultipleRegression,
  fitInteractionRegression,
  type IceCreamPoint,
  type SimpleReg,
  type MultipleReg,
  type InteractionReg,
} from "./types";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number, d = 2): string {
  return n.toFixed(d);
}

// ── Scatter SVG ───────────────────────────────────────────────────────────────
type ModelMode = "simple" | "multiple" | "interaction";

interface ScatterProps {
  data: IceCreamPoint[];
  mode: ModelMode;
  simple: SimpleReg;
  multiple: MultipleReg;
  interaction: InteractionReg;
}

function ScatterPlot({ data, mode, simple, multiple, interaction }: ScatterProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    point: IceCreamPoint;
  } | null>(null);

  const W = 520;
  const H = 340;
  const PAD = { l: 52, r: 20, t: 20, b: 50 };
  const IW = W - PAD.l - PAD.r;
  const IH = H - PAD.t - PAD.b;

  const tempMin = 14;
  const tempMax = 36;
  const salesMin = 15;
  const salesMax = 90;

  const tx = (temp: number) =>
    PAD.l + ((temp - tempMin) / (tempMax - tempMin)) * IW;
  const ty = (sales: number) =>
    PAD.t + IH - ((sales - salesMin) / (salesMax - salesMin)) * IH;

  const xTicks = [15, 18, 21, 24, 27, 30, 33];
  const yTicks = [20, 30, 40, 50, 60, 70, 80];

  // OLS line points for a given predict function
  function linePath(predict: (t: number) => number, color: string, dashed = false) {
    const pts = [tempMin, tempMax].map((t) => ({
      x: tx(t),
      y: ty(Math.max(salesMin, Math.min(salesMax, predict(t)))),
    }));
    return (
      <line
        x1={pts[0].x}
        y1={pts[0].y}
        x2={pts[1].x}
        y2={pts[1].y}
        stroke={color}
        strokeWidth="2.5"
        strokeDasharray={dashed ? "6,3" : undefined}
        opacity={0.9}
      />
    );
  }

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ overflow: "visible" }}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Grid lines */}
        {xTicks.map((t) => (
          <g key={`xg-${t}`}>
            <line
              x1={tx(t)}
              y1={PAD.t}
              x2={tx(t)}
              y2={PAD.t + IH}
              stroke="#1e293b"
              strokeWidth="1"
            />
            <text
              x={tx(t)}
              y={PAD.t + IH + 16}
              textAnchor="middle"
              fill="#475569"
              fontSize="9"
            >
              {t}°
            </text>
          </g>
        ))}
        {yTicks.map((t) => (
          <g key={`yg-${t}`}>
            <line
              x1={PAD.l}
              y1={ty(t)}
              x2={PAD.l + IW}
              y2={ty(t)}
              stroke="#1e293b"
              strokeWidth="1"
            />
            <text
              x={PAD.l - 8}
              y={ty(t) + 3.5}
              textAnchor="end"
              fill="#475569"
              fontSize="9"
            >
              {t}
            </text>
          </g>
        ))}

        {/* Axes */}
        <line
          x1={PAD.l}
          y1={PAD.t + IH}
          x2={PAD.l + IW}
          y2={PAD.t + IH}
          stroke="#334155"
          strokeWidth="1"
        />
        <line
          x1={PAD.l}
          y1={PAD.t}
          x2={PAD.l}
          y2={PAD.t + IH}
          stroke="#334155"
          strokeWidth="1"
        />

        {/* Axis labels */}
        <text
          x={PAD.l + IW / 2}
          y={H - 4}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize="10"
        >
          Temperature (°C)
        </text>
        <text
          x={14}
          y={PAD.t + IH / 2}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize="10"
          transform={`rotate(-90, 14, ${PAD.t + IH / 2})`}
        >
          Sales ($k)
        </text>

        {/* Regression lines */}
        {mode === "simple" &&
          linePath(
            (t) => simple.slope * t + simple.intercept,
            "var(--color-accent)"
          )}

        {mode === "multiple" && (
          <>
            {linePath(
              (t) => multiple.interceptCoeff + multiple.tempCoeff * t,
              "#3bb4a4"
            )}
            {linePath(
              (t) =>
                multiple.interceptCoeff +
                multiple.weekendCoeff +
                multiple.tempCoeff * t,
              "var(--color-accent)"
            )}
          </>
        )}

        {mode === "interaction" && (
          <>
            {linePath(
              (t) => interaction.interceptCoeff + interaction.tempCoeff * t,
              "#3bb4a4"
            )}
            {linePath(
              (t) =>
                interaction.interceptCoeff +
                interaction.weekendCoeff +
                (interaction.tempCoeff + interaction.interactionCoeff) * t,
              "var(--color-accent)"
            )}
          </>
        )}

        {/* Data points */}
        {data.map((p) => (
          <circle
            key={p.id}
            cx={tx(p.temperature)}
            cy={ty(p.sales)}
            r={5}
            fill={p.weekend === 1 ? "var(--color-accent)" : "#3bb4a4"}
            stroke="#0f172a"
            strokeWidth="1.5"
            opacity={0.85}
            style={{ cursor: "pointer" }}
            onMouseEnter={() => {
              setTooltip({
                x: tx(p.temperature),
                y: ty(p.sales),
                point: p,
              });
            }}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}

        {/* Tooltip */}
        {tooltip && (
          <g>
            <rect
              x={tooltip.x + 8}
              y={tooltip.y - 36}
              width={130}
              height={52}
              rx="4"
              fill="#0f172a"
              stroke="#1e293b"
              strokeWidth="1"
            />
            <text
              x={tooltip.x + 14}
              y={tooltip.y - 20}
              fill="#f1f5f9"
              fontSize="9"
              fontWeight="600"
            >
              {tooltip.point.weekend ? "Weekend" : "Weekday"}
            </text>
            <text x={tooltip.x + 14} y={tooltip.y - 8} fill="#94a3b8" fontSize="9">
              Temp: {tooltip.point.temperature}°C
            </text>
            <text x={tooltip.x + 14} y={tooltip.y + 4} fill="#94a3b8" fontSize="9">
              Sales: ${tooltip.point.sales}k
            </text>
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-2 justify-center flex-wrap text-[11px]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#3bb4a4]" />
          <span className="text-[#94a3b8]">Weekday</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[var(--color-accent)]" />
          <span className="text-[#94a3b8]">Weekend</span>
        </div>
        {mode === "simple" && (
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-0.5 bg-[var(--color-accent)]" />
            <span className="text-[#94a3b8]">OLS line (temp only)</span>
          </div>
        )}
        {(mode === "multiple" || mode === "interaction") && (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-0.5 bg-[#3bb4a4]" />
              <span className="text-[#94a3b8]">Weekday line</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-0.5 bg-[var(--color-accent)]" />
              <span className="text-[#94a3b8]">Weekend line</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Coefficient Comparison Table ──────────────────────────────────────────────
interface CompTableProps {
  simple: SimpleReg;
  multiple: MultipleReg;
  interaction: InteractionReg;
  mode: ModelMode;
}

function CoefficientTable({ simple, multiple, interaction, mode }: CompTableProps) {
  const rows = [
    {
      label: "Intercept",
      simple: simple.intercept,
      multiple: multiple.interceptCoeff,
      interaction: interaction.interceptCoeff,
      highlight: false,
    },
    {
      label: "Temperature",
      simple: simple.slope,
      multiple: multiple.tempCoeff,
      interaction: interaction.tempCoeff,
      highlight: true,
    },
    {
      label: "Weekend",
      simple: null,
      multiple: multiple.weekendCoeff,
      interaction: interaction.weekendCoeff,
      highlight: false,
    },
    {
      label: "Temp × Weekend",
      simple: null,
      multiple: null,
      interaction: interaction.interactionCoeff,
      highlight: false,
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr>
            <th className="text-left px-3 py-2 text-[#475569] font-semibold text-[11px] uppercase tracking-wider border-b border-[#1e293b]">
              Coefficient
            </th>
            <th
              className={`px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider border-b border-[#1e293b] transition-colors ${
                mode === "simple" ? "text-[var(--color-accent)]" : "text-[#475569]"
              }`}
            >
              Simple
            </th>
            <th
              className={`px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider border-b border-[#1e293b] transition-colors ${
                mode === "multiple" ? "text-[#3bb4a4]" : "text-[#475569]"
              }`}
            >
              + Weekend
            </th>
            <th
              className={`px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider border-b border-[#1e293b] transition-colors ${
                mode === "interaction" ? "text-[#a855f7]" : "text-[#475569]"
              }`}
            >
              + Interaction
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ label, simple: s, multiple: m, interaction: ix, highlight }) => (
            <tr key={label} className="border-b border-[#0f172a]/60">
              <td className="px-3 py-2.5 font-mono text-[#94a3b8]">{label}</td>
              <td className="px-3 py-2.5 text-center">
                {s !== null ? (
                  <span
                    className={`font-mono font-semibold ${
                      highlight ? "text-[var(--color-accent)]" : "text-[#f1f5f9]"
                    }`}
                  >
                    {fmt(s, 3)}
                  </span>
                ) : (
                  <span className="text-[#334155]">—</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-center">
                {m !== null ? (
                  <span
                    className={`font-mono font-semibold ${
                      highlight ? "text-[#3bb4a4]" : "text-[#f1f5f9]"
                    }`}
                  >
                    {fmt(m, 3)}
                  </span>
                ) : (
                  <span className="text-[#334155]">—</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-center">
                {ix !== null ? (
                  <span
                    className={`font-mono font-semibold ${
                      highlight ? "text-[#a855f7]" : "text-[#f1f5f9]"
                    }`}
                  >
                    {fmt(ix, 3)}
                  </span>
                ) : (
                  <span className="text-[#334155]">—</span>
                )}
              </td>
            </tr>
          ))}
          {/* R² row */}
          <tr className="border-b border-[#0f172a]/60 bg-[#0f172a]/30">
            <td className="px-3 py-2.5 font-mono text-[#475569]">R²</td>
            <td className="px-3 py-2.5 text-center font-mono text-[var(--color-accent)]">
              {fmt(simple.rSquared, 4)}
            </td>
            <td className="px-3 py-2.5 text-center font-mono text-[#3bb4a4]">
              {fmt(multiple.rSquared, 4)}
            </td>
            <td className="px-3 py-2.5 text-center font-mono text-[#a855f7]">
              {fmt(interaction.rSquared, 4)}
            </td>
          </tr>
          <tr>
            <td className="px-3 py-2.5 font-mono text-[#475569]">Adj. R²</td>
            <td className="px-3 py-2.5 text-center font-mono text-[#475569]">—</td>
            <td className="px-3 py-2.5 text-center font-mono text-[#3bb4a4]">
              {fmt(multiple.adjustedRSquared, 4)}
            </td>
            <td className="px-3 py-2.5 text-center font-mono text-[#a855f7]">
              {fmt(interaction.adjustedRSquared, 4)}
            </td>
          </tr>
        </tbody>
      </table>
      {/* Highlight note for temp row */}
      <p className="mt-2 text-[10px] text-[#475569] px-3">
        Temperature coefficient highlighted: compare values across models to see confounding effect.
      </p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MultipleRegressionClient() {
  const { data: session } = useSession();

  const [mode, setMode] = useState<ModelMode>("simple");
  const [simpleViewed, setSimpleViewed] = useState(false);
  const [multipleViewed, setMultipleViewed] = useState(false);
  const [interactionViewed, setInteractionViewed] = useState(false);
  const [interpretedCoeff, setInterpretedCoeff] = useState(false);
  const [confoundingIdentified, setConfoundingIdentified] = useState(false);
  const completionFired = useRef(false);

  // Pre-compute all regressions (data is fixed — useMemo prevents re-running)
  const simple = useMemo(() => fitSimpleRegression(ICE_CREAM_DATA), []);
  const multiple = useMemo(() => fitMultipleRegression(ICE_CREAM_DATA), []);
  const interaction = useMemo(() => fitInteractionRegression(ICE_CREAM_DATA), []);

  // Track mode changes for progress
  useEffect(() => {
    if (mode === "simple") setSimpleViewed(true);
    if (mode === "multiple") setMultipleViewed(true);
    if (mode === "interaction") setInteractionViewed(true);
  }, [mode]);

  // Confounding identified when user has seen both multiple + interaction
  useEffect(() => {
    if (multipleViewed && interactionViewed) setConfoundingIdentified(true);
  }, [multipleViewed, interactionViewed]);

  const allComplete =
    simpleViewed &&
    multipleViewed &&
    interactionViewed &&
    interpretedCoeff &&
    confoundingIdentified;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guideSlug: "multiple-regression-confounding",
          score: 100,
        }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  const progress = [
    { label: "Simple model viewed", done: simpleViewed },
    { label: "Multiple model viewed", done: multipleViewed },
    { label: "Coefficients interpreted", done: interpretedCoeff },
    { label: "Interaction explored", done: interactionViewed },
    { label: "Confounding identified", done: confoundingIdentified },
  ];

  // Omitted-variable bias of the simple model: how much the temp-only slope
  // is inflated by absorbing the weekend effect (simple minus multiple).
  const biasDelta = simple.slope - multiple.tempCoeff;

  const interactionR2Improvement = interaction.rSquared - multiple.rSquared;

  // Weekend slope in interaction model
  const weekendTempSlope = interaction.tempCoeff + interaction.interactionCoeff;

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Multiple Regression & Confounding</span>
        </nav>

        {/* Hero */}
        <motion.section
          className="mb-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              UNIT 10: REGRESSION FOUNDATIONS
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Multiple Regression &amp;{" "}
            <span className="text-[var(--color-accent)]">Confounding</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[640px]">
            Add predictors and watch coefficient estimates shift. Understand why
            controlling for confounders reveals true effects.
          </p>
        </motion.section>

        {/* Progress dots */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {progress.map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  done ? "bg-[#3bb4a4]" : "bg-[#1e293b]"
                }`}
              />
              <span
                className={`text-[11px] ${done ? "text-white" : "text-[#475569]"}`}
              >
                {label}
              </span>
            </div>
          ))}
          {!session?.user && (
            <p className="text-[11px] text-[#475569] ml-auto">
              <Link
                href="/auth/sign-in"
                className="underline underline-offset-2 hover:text-[#94a3b8]"
              >
                Sign in
              </Link>{" "}
              to track progress
            </p>
          )}
          <AnimatePresence>
            {allComplete && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="ml-auto text-[11px] font-semibold text-[#3bb4a4] flex items-center gap-1"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Section 1 — Dataset description card */}
        <motion.div
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 mb-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-2">
            The Dataset
          </p>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed mb-4 max-w-[700px]">
            Daily ice cream sales at a beach café (50 observations). Two
            predictors: <span className="text-white font-medium">Temperature (°C)</span>{" "}
            and whether the day is a{" "}
            <span className="text-[var(--color-accent)] font-medium">Weekend</span>. Goal: understand
            how each factor drives sales, accounting for the other.
          </p>
          <div className="flex flex-wrap gap-4 text-[12px]">
            {[
              { label: "Observations", value: "50 days" },
              { label: "Temp range", value: "15 – 35 °C" },
              { label: "Weekend days", value: `${ICE_CREAM_DATA.filter((d) => d.weekend).length} / 50` },
              { label: "Sales range", value: `$${Math.min(...ICE_CREAM_DATA.map((d) => d.sales))}k – $${Math.max(...ICE_CREAM_DATA.map((d) => d.sales))}k` },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col">
                <span className="text-[#475569] text-[10px] uppercase tracking-wider">
                  {label}
                </span>
                <span className="text-white font-semibold">{value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Section 2 — Model mode toggle */}
        <div className="flex gap-2 mb-6 flex-wrap" role="radiogroup" aria-label="Regression model mode">
          {(
            [
              {
                key: "simple",
                label: "Simple Regression",
                subtitle: "Temp only",
                color: "#d4af37",
              },
              {
                key: "multiple",
                label: "+ Weekend",
                subtitle: "Temp + Weekend",
                color: "#3bb4a4",
              },
              {
                key: "interaction",
                label: "+ Interaction",
                subtitle: "Temp × Weekend",
                color: "#a855f7",
              },
            ] as const
          ).map(({ key, label, subtitle, color }) => (
            <button
              key={key}
              role="radio"
              aria-checked={mode === key}
              onClick={() => setMode(key)}
              className="flex-1 min-w-[140px] px-4 py-3 rounded-xl border text-left transition-all duration-200"
              style={{
                borderColor: mode === key ? color : "#1e293b",
                background: mode === key ? `${color}18` : "transparent",
              }}
            >
              <p
                className="text-[13px] font-semibold"
                style={{ color: mode === key ? color : "#94a3b8" }}
              >
                {label}
              </p>
              <p className="text-[10px] text-[#475569] mt-0.5">{subtitle}</p>
            </button>
          ))}
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          {/* Left — Scatter + equation */}
          <div className="space-y-5">
            {/* Scatter card */}
            <motion.div
              key={`scatter-${mode}`}
              className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-4">
                Scatter Plot: Ice Cream Sales vs Temperature
              </p>
              <ScatterPlot
                data={ICE_CREAM_DATA}
                mode={mode}
                simple={simple}
                multiple={multiple}
                interaction={interaction}
              />
              <p className="text-[10px] text-[#334155] mt-3 text-center">
                Hover over any point to see its values.
              </p>
            </motion.div>

            {/* Equation + stats card */}
            <AnimatePresence mode="wait">
              {mode === "simple" && (
                <motion.div
                  key="eq-simple"
                  className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">
                    Simple Regression Equation
                  </p>
                  <div className="rounded-xl bg-[#1e293b]/60 px-4 py-3 font-mono text-[13px] text-white mb-4">
                    Sales ={" "}
                    <span className="text-[var(--color-accent)]">
                      {fmt(simple.intercept)}
                    </span>{" "}
                    +{" "}
                    <span className="text-[var(--color-accent)]">
                      {fmt(simple.slope)}
                    </span>{" "}
                    × Temp
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded-xl border border-[#1e293b] p-3">
                      <p className="text-[10px] text-[#475569] mb-1">R²</p>
                      <p className="text-[18px] font-bold text-[var(--color-accent)] font-mono">
                        {fmt(simple.rSquared, 4)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#1e293b] p-3">
                      <p className="text-[10px] text-[#475569] mb-1">RMSE</p>
                      <p className="text-[18px] font-bold text-[var(--color-accent)] font-mono">
                        {fmt(simple.rmse, 2)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#1e293b] p-3 mb-3">
                    <p className="text-[11px] font-semibold text-white mb-1">
                      Temperature coefficient:{" "}
                      <span className="text-[var(--color-accent)] font-mono">{fmt(simple.slope, 3)}</span>
                    </p>
                    <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                      For every +1°C increase in temperature, sales increase by{" "}
                      <span className="text-white font-medium">
                        ${fmt(simple.slope, 2)}k
                      </span>{" "}
                      (according to this simple model).
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/5 px-4 py-3">
                    <p className="text-[11px] text-[var(--color-accent)] font-semibold mb-1">
                      Note
                    </p>
                    <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                      This model ignores whether it&apos;s a weekend. In this
                      dataset, weekend days are both hotter AND more sales-prone,
                      so the temperature slope absorbs part of the weekend effect
                      and comes out inflated.
                    </p>
                  </div>
                </motion.div>
              )}

              {mode === "multiple" && (
                <motion.div
                  key="eq-multiple"
                  className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">
                    Multiple Regression Equation
                  </p>
                  <div className="rounded-xl bg-[#1e293b]/60 px-4 py-3 font-mono text-[12px] text-white mb-4 leading-relaxed">
                    Sales ={" "}
                    <span className="text-[#3bb4a4]">
                      {fmt(multiple.interceptCoeff, 2)}
                    </span>{" "}
                    +{" "}
                    <span className="text-[#3bb4a4]">
                      {fmt(multiple.tempCoeff, 3)}
                    </span>{" "}
                    × Temp +{" "}
                    <span className="text-[var(--color-accent)]">
                      {fmt(multiple.weekendCoeff, 3)}
                    </span>{" "}
                    × Weekend
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded-xl border border-[#1e293b] p-3">
                      <p className="text-[10px] text-[#475569] mb-1">R²</p>
                      <p className="text-[18px] font-bold text-[#3bb4a4] font-mono">
                        {fmt(multiple.rSquared, 4)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#1e293b] p-3">
                      <p className="text-[10px] text-[#475569] mb-1">Adj. R²</p>
                      <p className="text-[18px] font-bold text-[#3bb4a4] font-mono">
                        {fmt(multiple.adjustedRSquared, 4)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="rounded-xl border border-[#3bb4a4]/30 bg-[#3bb4a4]/5 p-3">
                      <p className="text-[11px] font-semibold text-[#3bb4a4] mb-1">
                        Temperature: {fmt(multiple.tempCoeff, 3)}
                      </p>
                      <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                        Holding weekend constant, each +1°C adds{" "}
                        <span className="text-white font-medium">
                          ${fmt(multiple.tempCoeff, 2)}k
                        </span>{" "}
                        in sales.
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/5 p-3">
                      <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1">
                        Weekend: {fmt(multiple.weekendCoeff, 3)}
                      </p>
                      <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                        On weekends vs. weekdays, sales are{" "}
                        <span className="text-white font-medium">
                          ${fmt(multiple.weekendCoeff, 2)}k
                        </span>{" "}
                        higher on average, controlling for temperature.
                      </p>
                    </div>
                  </div>

                  {/* Confounding card */}
                  <div className="rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/8 px-4 py-3">
                    <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-2">
                      Confounding Effect
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center mb-2">
                      <div>
                        <p className="text-[10px] text-[#475569]">Simple slope</p>
                        <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                          {fmt(simple.slope, 3)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#475569]">Multiple slope</p>
                        <p className="text-[14px] font-mono font-bold text-[#3bb4a4]">
                          {fmt(multiple.tempCoeff, 3)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#475569]">Bias (Δβ)</p>
                        <p
                          className="text-[14px] font-mono font-bold"
                          style={{
                            color: Math.abs(biasDelta) > 0.05 ? "#ef4444" : "#3bb4a4",
                          }}
                        >
                          {biasDelta >= 0 ? "+" : ""}
                          {fmt(biasDelta, 3)}
                        </p>
                      </div>
                    </div>
                    <p className="text-[10px] text-[#94a3b8] leading-relaxed">
                      Δβ = simple slope minus multiple slope ={" "}
                      <span className="font-mono">{fmt(biasDelta, 3)}</span>: the
                      omitted-variable bias introduced by ignoring weekend status.
                      In this sample, weekend days are also the hottest days, so the
                      simple model over-attributes weekend footfall to temperature
                      and its slope comes out too high.
                    </p>
                  </div>
                </motion.div>
              )}

              {mode === "interaction" && (
                <motion.div
                  key="eq-interaction"
                  className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">
                    Interaction Model Equation
                  </p>
                  <div className="rounded-xl bg-[#1e293b]/60 px-4 py-3 font-mono text-[11px] text-white mb-4 leading-relaxed">
                    Sales ={" "}
                    <span className="text-[#a855f7]">
                      {fmt(interaction.interceptCoeff, 2)}
                    </span>{" "}
                    +{" "}
                    <span className="text-[#3bb4a4]">
                      {fmt(interaction.tempCoeff, 3)}
                    </span>{" "}
                    × Temp +{" "}
                    <span className="text-[var(--color-accent)]">
                      {fmt(interaction.weekendCoeff, 3)}
                    </span>{" "}
                    × Weekend +{" "}
                    <span className="text-[#a855f7]">
                      {fmt(interaction.interactionCoeff, 3)}
                    </span>{" "}
                    × (Temp × Weekend)
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded-xl border border-[#1e293b] p-3">
                      <p className="text-[10px] text-[#475569] mb-1">R²</p>
                      <p className="text-[18px] font-bold text-[#a855f7] font-mono">
                        {fmt(interaction.rSquared, 4)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#1e293b] p-3">
                      <p className="text-[10px] text-[#475569] mb-1">Adj. R²</p>
                      <p className="text-[18px] font-bold text-[#a855f7] font-mono">
                        {fmt(interaction.adjustedRSquared, 4)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#a855f7]/30 bg-[#a855f7]/5 p-3 mb-4">
                    <p className="text-[11px] font-semibold text-[#a855f7] mb-1">
                      Interaction term: {fmt(interaction.interactionCoeff, 3)}
                    </p>
                    <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                      The temperature effect on weekdays is{" "}
                      <span className="font-mono text-[#3bb4a4]">
                        {fmt(interaction.tempCoeff, 3)}
                      </span>
                      . On weekends it becomes{" "}
                      <span className="font-mono text-[var(--color-accent)]">
                        {fmt(weekendTempSlope, 3)}
                      </span>{" "}
                      ({interaction.interactionCoeff >= 0 ? "stronger" : "weaker"} effect of
                      temperature on weekends).
                    </p>
                  </div>

                  {/* ΔR² improvement badge */}
                  <div
                    className="rounded-xl border px-4 py-3 flex items-center justify-between"
                    style={{
                      borderColor:
                        interactionR2Improvement > 0.002
                          ? "#a855f7"
                          : "#1e293b",
                      background:
                        interactionR2Improvement > 0.002
                          ? "#a855f7" + "10"
                          : "transparent",
                    }}
                  >
                    <div>
                      <p className="text-[11px] font-semibold text-white">
                        ΔR² from adding interaction
                      </p>
                      <p className="text-[10px] text-[#475569] mt-0.5">
                        Multiple R² = {fmt(multiple.rSquared, 4)} →
                        Interaction R² = {fmt(interaction.rSquared, 4)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className="text-[20px] font-bold font-mono"
                        style={{
                          color:
                            interactionR2Improvement > 0.002
                              ? "#a855f7"
                              : "#475569",
                        }}
                      >
                        +{fmt(interactionR2Improvement, 4)}
                      </p>
                      <p className="text-[9px] text-[#475569]">
                        {interactionR2Improvement > 0.002
                          ? "Interaction improves fit"
                          : "Minimal improvement"}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right panel — concepts + coefficient comparison */}
          <div className="space-y-5">
            {/* Key concept cards */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-4">
                Key Concepts
              </p>
              <div className="space-y-3">
                {[
                  {
                    title: "Confounding Variable",
                    body: "A variable correlated with both the predictor and outcome, creating spurious associations.",
                    color: "var(--color-accent)",
                  },
                  {
                    title: "Omitted Variable Bias",
                    body: "Excluding a relevant predictor causes its effect to leak into other coefficients.",
                    color: "#ef4444",
                  },
                  {
                    title: "Parallel Lines",
                    body: "In an additive model, lines for different groups are parallel: same slope, different intercept.",
                    color: "#3bb4a4",
                  },
                  {
                    title: "Interaction Effect",
                    body: "When the effect of X₁ on Y changes depending on the value of X₂.",
                    color: "#a855f7",
                  },
                  {
                    title: "Adjusted R²",
                    body: "Penalizes adding predictors that don't meaningfully improve fit.",
                    color: "#94a3b8",
                  },
                ].map(({ title, body, color }) => (
                  <div
                    key={title}
                    className="rounded-lg border border-[#1e293b]/80 p-3"
                  >
                    <p
                      className="text-[11px] font-semibold mb-1"
                      style={{ color }}
                    >
                      {title}
                    </p>
                    <p className="text-[11px] text-[#475569] leading-relaxed">
                      {body}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* R² comparison bar */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-4">
                R² Comparison
              </p>
              {[
                { label: "Simple", value: simple.rSquared, color: "var(--color-accent)" },
                {
                  label: "+ Weekend",
                  value: multiple.rSquared,
                  color: "#3bb4a4",
                },
                {
                  label: "+ Interaction",
                  value: interaction.rSquared,
                  color: "#a855f7",
                },
              ].map(({ label, value, color }) => (
                <div key={label} className="mb-3">
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-[#475569]">{label}</span>
                    <span className="font-mono font-semibold" style={{ color }}>
                      {fmt(value, 4)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#1e293b] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(0, value * 100)}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 3 — Coefficient comparison table (always visible) */}
        <motion.div
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 mt-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          onMouseEnter={() => setInterpretedCoeff(true)}
          onClick={() => setInterpretedCoeff(true)}
        >
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569]">
              Coefficient Comparison Table
            </p>
            {Math.abs(biasDelta) > 0.1 && (
              <span className="text-[10px] font-semibold text-[#ef4444] border border-[#ef4444]/30 bg-[#ef4444]/8 rounded-full px-2.5 py-1">
                Temperature coefficient shifts across models: confounding effect!
              </span>
            )}
          </div>
          <CoefficientTable
            simple={simple}
            multiple={multiple}
            interaction={interaction}
            mode={mode}
          />
        </motion.div>

        {/* Footer nav */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link
            href="/visual-guides/simple-linear-regression"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            ← Simple Linear Regression
          </Link>
          <Link
            href="/visual-guides/regression-diagnostics"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            Regression Diagnostics →
          </Link>
        </div>

        <GuideCompletion isComplete={allComplete} guideSlug="multiple-regression-confounding" score={100} />
      </div>
    </div>
  );
}
