"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StageId } from "./types";
import MiniChallenge from "./MiniChallenge";

// ── Stage Visuals ───────────────────────────────────────────────────────────

function RawSourceVisual() {
  const cards = [
    { label: "sales_FINAL_v2.csv", color: "#ef4444", rotate: -3, lines: ["Date,Product,Rev???", "2024-01,Widget??,$1,240", "2024-01,Widget??,???"] },
    { label: "GET /api/users",     color: "var(--color-warning)", rotate: 2,  lines: ['{"users":[', '  {???name???:???Alice???', '  "id":null,"email":""}]}'] },
    { label: "form_log.txt",       color: "#a855f7", rotate: -2, lines: ["Name: Alice Sm??h", "Email: alic@", "Phone: ???-???-????"] },
    { label: "sensor_data.txt",    color: "#94a3b8", rotate: 3,  lines: ["10:23:01 temp=23.5", "10:23:02 temp=ERR", "10:23:03 --------"] },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 pb-2">
      {cards.map((card, i) => (
        <motion.div key={card.label}
          initial={{ opacity: 0, y: 16, rotate: 0 }}
          animate={{ opacity: 1, y: 0, rotate: card.rotate }}
          transition={{ delay: i * 0.08, type: "spring", bounce: 0.3 }}
          className="rounded-lg border bg-[#0f172a] overflow-hidden shadow-xl"
          style={{ borderColor: `color-mix(in srgb, ${card.color} 25%, transparent)` }}
        >
          <div className="px-2 py-1 text-[9px] font-semibold truncate" style={{ background: `color-mix(in srgb, ${card.color} 9%, transparent)`, color: card.color }}>{card.label}</div>
          <div className="px-2 py-1.5 font-mono space-y-0.5">
            {card.lines.map((line, j) => (
              <div key={j} className={`text-[9px] ${j === 1 ? "line-through opacity-50 text-[#475569]" : "text-[#94a3b8]"}`}>{line}</div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function CollectionVisual() {
  const sources = [
    { id: "API",  y: 18 },
    { id: "CSV",  y: 42 },
    { id: "DB",   y: 66 },
    { id: "Form", y: 90 },
  ];

  return (
    <div className="bg-[#1e293b]/20 rounded-xl border border-[#1e293b] overflow-hidden mb-6 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[var(--color-warning)] mb-3">Live Collection</p>
      <svg width="100%" height="110" viewBox="0 0 520 110" className="overflow-visible">
        {/* Source boxes */}
        {sources.map((s) => (
          <g key={s.id}>
            <rect x="4" y={s.y - 10} width="48" height="20" rx="5" fill="#f9731618" stroke="#f9731644" />
            <text x="28" y={s.y + 5} textAnchor="middle" fontSize="9" fill="var(--color-warning)" fontFamily="monospace">{s.id}</text>
          </g>
        ))}

        {/* Dashed lines from sources to staging */}
        {sources.map((s) => (
          <line key={`line-${s.id}`} x1="54" y1={s.y} x2="370" y2="55" stroke="var(--color-warning)" strokeWidth="1" strokeDasharray="4 3" opacity="0.3" />
        ))}

        {/* Traveling dots per source — pure SVG SMIL so they stay on the lines */}
        {sources.map((s, si) =>
          [0, 1, 2].map((j) => (
            <circle key={`${s.id}-${j}`} r="3" fill="var(--color-warning)">
              <animateMotion dur="1.6s" begin={`${si * 0.3 + j * 0.55}s`} repeatCount="indefinite"
                path={`M54,${s.y} L370,55`} />
              <animate attributeName="opacity" values="0;1;1;0" dur="1.6s" begin={`${si * 0.3 + j * 0.55}s`} repeatCount="indefinite" />
            </circle>
          ))
        )}

        {/* Staging area */}
        <rect x="370" y="20" width="140" height="70" rx="8" fill="#f9731610" stroke="#f9731640" />
        <text x="440" y="46" textAnchor="middle" fontSize="8" fill="#94a3b8" fontFamily="monospace">staging_area</text>
        {["id,name,revenue", "1,Alice,4500", "2,Bob,null", "3,Carol,8200"].map((row, ri) => (
          <motion.text key={ri} x="440" y={58 + ri * 9} textAnchor="middle" fontSize="7" fill={ri === 0 ? "var(--color-warning)" : "#475569"} fontFamily="monospace"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 + ri * 0.3 }}>
            {row}
          </motion.text>
        ))}
      </svg>
    </div>
  );
}

function CleaningVisual() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pct, setPct]         = useState(25);
  const dragging              = useRef(false);

  const onMove = useCallback((clientX: number) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPct(Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100)));
  }, []);

  const COLS = ["id", "city", "revenue", "date"];
  const beforeRows: { id: number | null; city: string | null; revenue: string | null; date: string | null }[] = [
    { id: 1, city: "New York",  revenue: "4500",    date: "2024-01-15" },
    { id: 2, city: "London",    revenue: null,       date: "2024-02-20" },
    { id: 3, city: "New Yrok",  revenue: "8200",     date: "2024-03-10" },
    { id: 4, city: "Berlin",    revenue: "$3,100",   date: "12/31/2024" },
    { id: 4, city: "Berlin",    revenue: "$3,100",   date: "12/31/2024" },
  ];
  const afterRows: { id: number | null; city: string | null; revenue: string | null; date: string | null }[] = [
    { id: 1, city: "New York",  revenue: "4500.00",  date: "2024-01-15" },
    { id: 2, city: "London",    revenue: "5300.00",  date: "2024-02-20" },
    { id: 3, city: "New York",  revenue: "8200.00",  date: "2024-03-10" },
    { id: 4, city: "Berlin",    revenue: "3100.00",  date: "2024-12-31" },
    { id: null, city: null,     revenue: null,        date: null },
  ];

  const errorRows: Record<number, string[]> = { 1: ["revenue"], 2: ["city", "date"], 3: ["revenue", "date"], 4: [] };

  type Row = { id: number | null; city: string | null; revenue: string | null; date: string | null };

  // Solid row backgrounds — no transparency so the overlay fully covers the base table
  const rowBg = (ri: number) => ri % 2 === 0 ? "#0f172a" : "#162032";

  function TableView({ rows, type }: { rows: Row[]; type: "before" | "after" }) {
    return (
      <table className="w-full border-collapse min-w-[340px]">
        <thead>
          <tr style={{ background: "#1e293b" }}>
            {COLS.map((c) => (
              <th key={c} scope="col" className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8] text-left">
                {c}
                {/* BEFORE/AFTER column header badge — only in the first column */}
                {c === "id" && (
                  <span
                    className="ml-2 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={
                      type === "before"
                        ? { color: "#ef4444", background: "#ef444420", border: "1px solid #ef444444" }
                        : { color: "#3bb4a4", background: "#3bb4a420", border: "1px solid #3bb4a444" }
                    }
                  >
                    {type}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              style={{ background: rowBg(ri) }}
              className={row.id === null && type === "after" ? "opacity-0 pointer-events-none" : ""}
            >
              {COLS.map((col) => {
                const val = row[col as keyof typeof row];
                const isErr = type === "before" && (errorRows[ri] || []).includes(col);
                const isFix = type === "after" && ri < 4 && (errorRows[ri] || []).includes(col);
                return (
                  <td
                    key={col}
                    className="px-3 py-2 text-[11px] whitespace-nowrap"
                    style={{
                      background: isErr ? "#3a1a1a" : isFix ? "#0f2a28" : rowBg(ri),
                      color: isErr ? "#ef4444" : isFix ? "var(--color-success)" : "#f1f5f9",
                    }}
                  >
                    {val === null ? <span className="italic text-[#475569]">null</span> : String(val)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div className="mb-6">
      <div
        ref={containerRef}
        className="relative rounded-xl border border-[#1e293b] overflow-hidden cursor-ew-resize select-none"
        onPointerMove={(e) => onMove(e.clientX)}
        onPointerUp={() => { dragging.current = false; }}
        onPointerLeave={() => { dragging.current = false; }}
      >
        {/* After (base — always full width underneath) */}
        <div className="overflow-x-auto"><TableView rows={afterRows} type="after" /></div>

        {/* Before (clipped overlay — solid backgrounds so it fully covers the after table) */}
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}>
          <div className="overflow-x-auto"><TableView rows={beforeRows} type="before" /></div>
        </div>

        {/* Drag handle */}
        <div
          className="absolute top-0 bottom-0 z-10 flex items-center touch-none"
          style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
          onPointerDown={(e) => { dragging.current = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }}
          role="slider" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}
        >
          <div className="w-0.5 h-full bg-white/70" />
          <div className="absolute w-7 h-7 rounded-full bg-white shadow-xl flex items-center justify-center text-[#0f172a] text-[11px] font-bold border border-white/20">
            ⟺
          </div>
        </div>
      </div>
      <p className="text-[11px] text-[#475569] mt-1.5 text-center">Drag the handle to reveal the cleaned data →</p>
    </div>
  );
}

function TransformationVisual() {
  const [step, setStep] = useState(0);

  const transforms = [
    { from: ["first_name", "last_name"], to: "full_name",       icon: "🔗", color: "#3b82f6" },
    { from: ["birth_date"],              to: "age",             icon: "🧮", color: "#a855f7" },
    { from: ["purchase_amount"],         to: "spend_tier",      icon: "📊", color: "var(--color-warning)" },
    { from: ["purchase_date"],           to: "day_of_week",     icon: "📅", color: "#3bb4a4" },
  ];

  useEffect(() => {
    if (step < transforms.length) {
      const t = setTimeout(() => setStep((s) => s + 1), 900);
      return () => clearTimeout(t);
    }
  }, [step, transforms.length]);

  return (
    <div className="bg-[#1e293b]/20 rounded-xl border border-[#1e293b] p-4 mb-6">
      <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#3b82f6] mb-3">Feature Engineering</p>
      <div className="flex flex-col gap-2">
        {transforms.map((t, i) => (
          <motion.div key={i}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: step > i ? 1 : 0.3 }}
            className="flex items-center gap-2 flex-wrap"
          >
            <div className="flex gap-1">
              {t.from.map((col) => (
                <span key={col} className="px-2 py-0.5 rounded bg-[#1e293b] border border-[#334155] text-[11px] font-mono text-[#94a3b8]">{col}</span>
              ))}
            </div>
            <span className="text-[13px]">{t.icon}</span>
            <span className="text-[#475569] text-[11px]">→</span>
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={step > i ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
              className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold border"
              style={{ background: `color-mix(in srgb, ${t.color} 9%, transparent)`, borderColor: `color-mix(in srgb, ${t.color} 27%, transparent)`, color: t.color }}
            >
              {t.to}
            </motion.span>
          </motion.div>
        ))}
      </div>
      {step < transforms.length && (
        <button onClick={() => setStep(transforms.length)} className="mt-3 text-[11px] text-[#475569] hover:text-[#94a3b8] underline transition-colors">
          Skip animation
        </button>
      )}
    </div>
  );
}

function AnalysisReadyVisual() {
  const cols = [
    { key: "full_name",  label: "full_name",  type: "string" },
    { key: "age",        label: "age",        type: "int" },
    { key: "spend_tier", label: "spend_tier", type: "category" },
    { key: "day_of_week",label: "day_of_week",type: "string" },
  ];
  const rows = [
    { full_name: "Alice Johnson", age: 34, spend_tier: "High",   day_of_week: "Monday"   },
    { full_name: "Bob Smith",     age: 28, spend_tier: "Low",    day_of_week: "Wednesday" },
    { full_name: "Carol Chen",    age: 41, spend_tier: "High",   day_of_week: "Friday"   },
    { full_name: "Dave Mueller",  age: 55, spend_tier: "Medium", day_of_week: "Tuesday"  },
  ];
  const stats = [
    { label: "12,847 rows",   icon: "≡" },
    { label: "8 columns",     icon: "⊞" },
    { label: "0 nulls",       icon: "✓" },
    { label: "0 duplicates",  icon: "✓" },
  ];
  const r = 22, circumference = 2 * Math.PI * r;
  const pct = 0.98;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[var(--color-accent)]">Analysis-Ready Dataset</p>
        {/* Quality ring */}
        <div className="flex items-center gap-2">
          <svg width="52" height="52" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r={r} fill="none" stroke="#1e293b" strokeWidth="4" />
            <motion.circle cx="26" cy="26" r={r} fill="none" stroke="var(--color-accent)" strokeWidth="4"
              strokeLinecap="round" strokeDasharray={`${pct * circumference} ${circumference}`}
              strokeDashoffset={circumference * 0.25}
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{ strokeDasharray: `${pct * circumference} ${circumference}` }}
              transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
            />
            <text x="26" y="31" textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--color-accent)" fontFamily="Inter, sans-serif">98%</text>
          </svg>
          <span className="text-[10px] text-[#94a3b8]">Quality</span>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-accent)]/20 overflow-hidden overflow-x-auto shadow-[0_0_24px_rgba(212,175,55,0.06)]">
        <table className="w-full border-collapse min-w-max">
          <thead>
            <tr className="bg-[#1e293b]">
              {cols.map((c) => (
                <th key={c.key} scope="col" className="px-3 py-2 text-left whitespace-nowrap">
                  <span className="text-[11px] font-semibold text-white">{c.label}</span>
                  <span className="ml-1.5 text-[9px] text-[var(--color-accent)]/60 font-normal">{c.type}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? "bg-[#0f172a]" : "bg-[#1e293b]/20"}>
                {cols.map((c) => (
                  <td key={c.key} className="px-3 py-2 text-[12px] text-[#f1f5f9] whitespace-nowrap">{String(row[c.key as keyof typeof row])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
        {stats.map((s) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="rounded-lg border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 px-3 py-2 flex items-center gap-2">
            <span className="text-[var(--color-accent)] text-[13px]">{s.icon}</span>
            <span className="text-[11px] font-medium text-white">{s.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Educational Content ─────────────────────────────────────────────────────

function RawSourceEdu() {
  const sources = [
    { icon: "📋", title: "Web Forms",         desc: "User-submitted data with typos, missing fields, inconsistent formats." },
    { icon: "🔌", title: "APIs",              desc: "JSON responses from third-party services; structures change without warning." },
    { icon: "📡", title: "Sensors / IoT",     desc: "Time-series readings with gaps, sensor errors, and duplicate timestamps." },
    { icon: "🗄️", title: "Legacy Databases",  desc: "Old tables with deprecated columns, mixed encodings, and undocumented fields." },
  ];
  return (
    <div>
      <p className="text-[13px] text-[#94a3b8] mb-4 leading-relaxed">
        Raw data is data in its original, unprocessed form, pulled directly from the source with no cleaning, standardization, or transformation applied. It is almost never analysis-ready.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {sources.map((s) => (
          <div key={s.title} className="flex gap-3 p-3 rounded-xl bg-[#1e293b]/30 border border-[#1e293b]">
            <span className="text-xl flex-shrink-0">{s.icon}</span>
            <div>
              <p className="text-[12px] font-semibold text-white mb-0.5">{s.title}</p>
              <p className="text-[11px] text-[#94a3b8]">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-[#ef4444]/5 border border-[#ef4444]/20 p-3">
        <p className="text-[11px] font-semibold text-[#ef4444] mb-1.5 uppercase tracking-wide">Common problems in raw data</p>
        <div className="flex flex-wrap gap-2">
          {["No standardization", "Duplicate records", "Missing values", "Mixed formats", "Encoding issues"].map((p) => (
            <span key={p} className="px-2 py-0.5 rounded-full text-[11px] bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20">{p}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function CollectionEdu() {
  const [etlMode, setEtlMode] = useState<"etl" | "elt">("etl");
  const [apiState, setApiState] = useState<"idle" | "loading" | "done">("idle");

  useEffect(() => {
    const t1 = setTimeout(() => setApiState("loading"), 400);
    const t2 = setTimeout(() => setApiState("done"),    1900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div>
      <p className="text-[13px] text-[#94a3b8] mb-4 leading-relaxed">
        Collection is the process of gathering data from disparate sources and landing it in a single unified location, typically a staging area, data warehouse, or data lake.
      </p>

      {/* Simulated API call */}
      <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] overflow-hidden mb-4">
        <div className="flex items-center gap-2 px-3 py-2 bg-[#1e293b] border-b border-[#334155]">
          <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
          <div className="w-2 h-2 rounded-full bg-[var(--color-warning)]" />
          <div className="w-2 h-2 rounded-full bg-[#3bb4a4]" />
          <span className="ml-2 text-[11px] font-mono text-[#94a3b8]">GET /api/sales?from=2024-01-01&to=2024-12-31</span>
        </div>
        <div className="p-3">
          {apiState === "idle" && <p className="text-[12px] text-[#475569] font-mono">Connecting...</p>}
          {apiState === "loading" && (
            <div className="flex items-center gap-2">
              <motion.div className="w-4 h-4 rounded-full border-2 border-[var(--color-warning)] border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
              <span className="text-[12px] font-mono text-[var(--color-warning)]">Fetching...</span>
            </div>
          )}
          {apiState === "done" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#3bb4a4]/15 text-[#3bb4a4] border border-[#3bb4a4]/30">200 OK</span>
                <span className="text-[11px] text-[#94a3b8] font-mono">3 records returned</span>
              </div>
              <div className="font-mono text-[10px] text-[#94a3b8] space-y-0.5">
                {[
                  '{"id":1,"product":"Widget A","revenue":4500,"date":"2024-01-15"}',
                  '{"id":2,"product":"Widget B","revenue":null,"date":"2024-02-20"}',
                  '{"id":3,"product":"Gadget C","revenue":8200,"date":"2024-03-10"}',
                ].map((line, i) => (
                  <motion.p key={i} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }}>{line}</motion.p>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* ETL vs ELT */}
      <div className="mb-4">
        <div className="flex gap-1 mb-3">
          {(["etl", "elt"] as const).map((m) => (
            <button key={m} onClick={() => setEtlMode(m)}
              className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold border transition-all ${etlMode === m ? "bg-[var(--color-warning)] border-[var(--color-warning)] text-[#0a0e1a]" : "border-[#1e293b] text-[#94a3b8] hover:border-[#334155]"}`}>
              {m.toUpperCase()}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={etlMode} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="rounded-xl bg-[var(--color-warning)]/5 border border-[var(--color-warning)]/20 p-3 text-[12px] text-[#94a3b8] leading-relaxed">
            {etlMode === "etl"
              ? "ETL (Extract → Transform → Load): Data is transformed before loading into the warehouse. Preferred when the target storage is limited or the schema is well-defined."
              : "ELT (Extract → Load → Transform): Raw data is loaded first, then transformed inside the warehouse. Preferred with cloud warehouses that have massive compute; transforms happen at query time."
            }
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function CleaningEdu() {
  const ops = [
    { icon: "🪟", title: "Deduplication",       desc: "Remove exact and near-duplicate rows using hashing or fuzzy matching." },
    { icon: "🕳️", title: "Null handling",        desc: "Fill missing values via mean/median/mode imputation, forward-fill, or row removal." },
    { icon: "✏️", title: "Typo correction",       desc: "Standardize text using fuzzy string matching (Levenshtein, Jaro-Winkler)." },
    { icon: "📐", title: "Format standardization", desc: "Unify date formats, numeric types, currency, and string encodings." },
    { icon: "📉", title: "Outlier detection",     desc: "Flag extreme values using IQR, z-scores, or domain-specific thresholds." },
  ];
  return (
    <div>
      <p className="text-[13px] text-[#94a3b8] mb-4 leading-relaxed">
        Cleaning transforms messy raw data into reliable, consistent records. It is the most time-consuming step of any data pipeline; data scientists spend up to 80% of their time here.
      </p>
      <div className="flex flex-col gap-2">
        {ops.map((op) => (
          <div key={op.title} className="flex gap-3 p-3 rounded-xl bg-[#1e293b]/30 border border-[#1e293b] items-start">
            <span className="text-base flex-shrink-0 mt-0.5">{op.icon}</span>
            <div>
              <p className="text-[12px] font-semibold text-white">{op.title}</p>
              <p className="text-[11px] text-[#94a3b8]">{op.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TransformationEdu() {
  const types = [
    { icon: "🔗", title: "Column merging",    desc: "Combine first_name + last_name → full_name. Reduces redundancy and simplifies analysis." },
    { icon: "🧮", title: "Feature derivation", desc: "Compute age from birth_date, revenue_per_unit from total / quantity." },
    { icon: "📊", title: "Binning / Bucketing", desc: "Convert purchase_amount into spend_tier: Low / Medium / High category labels." },
    { icon: "📅", title: "Date extraction",    desc: "Pull year, month, day, weekday, or quarter from timestamp columns." },
  ];
  return (
    <div>
      <p className="text-[13px] text-[#94a3b8] mb-4 leading-relaxed">
        Transformation reshapes data to make it more useful for analysis. The goal is feature engineering: creating new variables from existing ones that capture more signal for models and reports.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {types.map((t) => (
          <div key={t.title} className="flex gap-3 p-3 rounded-xl bg-[#1e293b]/30 border border-[#1e293b]">
            <span className="text-base flex-shrink-0">{t.icon}</span>
            <div>
              <p className="text-[12px] font-semibold text-white mb-0.5">{t.title}</p>
              <p className="text-[11px] text-[#94a3b8]">{t.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-[#3b82f6]/5 border border-[#3b82f6]/20 p-3 text-[11px] text-[#94a3b8] leading-relaxed">
        <strong className="text-[#93c5fd]">Advanced techniques: </strong>
        Normalization (scaling values to [0,1]), standardization (z-score), one-hot encoding (categories → binary columns), and label encoding are common next steps before feeding data into ML models.
      </div>
    </div>
  );
}

function AnalysisReadyEdu() {
  const uses = [
    { icon: "📈", title: "Statistical Analysis", desc: "Run descriptive stats, correlations, hypothesis tests, and regression models." },
    { icon: "🧠", title: "Machine Learning",      desc: "Train models with clean features and reliable, consistently-typed labels." },
    { icon: "📊", title: "Visualization",          desc: "Create accurate dashboards, reports, and charts with trusted data." },
  ];
  return (
    <div>
      <p className="text-[13px] text-[#94a3b8] mb-4 leading-relaxed">
        An analysis-ready dataset is complete, consistent, properly typed, and documented. Every column has a clear meaning and a known valid range.
      </p>
      <div className="flex flex-col gap-3 mb-4">
        {uses.map((u) => (
          <div key={u.title} className="flex gap-3 p-3 rounded-xl bg-[#1e293b]/30 border border-[#1e293b] items-center">
            <span className="text-xl flex-shrink-0">{u.icon}</span>
            <div>
              <p className="text-[12px] font-semibold text-white mb-0.5">{u.title}</p>
              <p className="text-[11px] text-[#94a3b8]">{u.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/20 p-3 text-[12px] text-[#94a3b8] leading-relaxed">
        <strong className="text-[var(--color-accent)]">Data Dictionary: </strong>
        Every production dataset should have one: a document describing each column&apos;s name, type, valid value range, and meaning. It prevents misinterpretation downstream.
      </div>
    </div>
  );
}

// ── StageContent dispatcher ────────────────────────────────────────────────

type Props = {
  stageId: StageId;
  color: string;
  isPassed: boolean;
  isCompleted: boolean;
  isVisible: boolean;
  onChallengePassed: () => void;
  onContinue: () => void;
};

function StageContentInner({ stageId, color, isPassed, isCompleted, isVisible, onChallengePassed, onContinue }: Props) {
  const Visuals: Record<StageId, React.FC> = {
    "raw-source":     RawSourceVisual,
    "collection":     CollectionVisual,
    "cleaning":       CleaningVisual,
    "transformation": TransformationVisual,
    "analysis-ready": AnalysisReadyVisual,
  };
  const Edus: Record<StageId, React.FC> = {
    "raw-source":     RawSourceEdu,
    "collection":     CollectionEdu,
    "cleaning":       CleaningEdu,
    "transformation": TransformationEdu,
    "analysis-ready": AnalysisReadyEdu,
  };

  const Visual = Visuals[stageId];
  const Edu    = Edus[stageId];

  return (
    <div className="px-5 pb-6 pt-2">
      <Visual />
      <Edu />

      <div className="h-px bg-[#1e293b] my-6" />

      {/* Mini challenge */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-4 h-px" style={{ background: color }} />
          <p className="text-[13px] font-semibold" style={{ color }}>Your Turn</p>
        </div>
        <MiniChallenge stageId={stageId} isPassed={isPassed} onPass={onChallengePassed} isVisible={isVisible} />
      </div>

      {/* Continue button */}
      {!isCompleted && (
        <div className="flex justify-end">
          <button
            onClick={isPassed ? onContinue : undefined}
            disabled={!isPassed}
            className={`px-6 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
              isPassed
                ? "bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90"
                : "bg-[#1e293b] text-[#475569] cursor-not-allowed"
            }`}
          >
            {isPassed ? "Continue →" : "Complete the challenge to continue"}
          </button>
        </div>
      )}
      {isCompleted && (
        <p className="text-[12px] text-[#3bb4a4] text-right">
          ✓ Stage completed. You can always revisit this content.
        </p>
      )}
    </div>
  );
}

const StageContent = React.memo(StageContentInner);
export default StageContent;
