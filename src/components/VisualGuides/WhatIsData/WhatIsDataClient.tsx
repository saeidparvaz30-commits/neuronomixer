"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { Table2, Braces, Layers } from "lucide-react";
import { BucketId, DataItemDef, ItemState } from "./types";
import DataItem from "./DataItem";
import CategoryBucket from "./CategoryBucket";
import SummaryCard from "./SummaryCard";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

// ── Data ───────────────────────────────────────────────────────────────────

const DATA_ITEMS: DataItemDef[] = [
  // Structured
  {
    id: "csv",
    label: "CSV Sales Data",
    bucket: "structured",
    tooltip: {
      type: "Structured",
      examples: [
        "Bank transaction records",
        "E-commerce product catalogs",
        "Sensor readings from IoT devices",
      ],
      keyTrait: "Fixed columns with defined data types: every row follows the exact same format.",
    },
    wrongHints: {
      semi: "Not quite: CSV has a rigid schema with fixed columns, not flexible tags.",
      unstructured: "Not quite: CSV data fits neatly into rows and columns with a strict schema.",
    },
  },
  {
    id: "sql",
    label: "SQL Database Table",
    bucket: "structured",
    tooltip: {
      type: "Structured",
      examples: [
        "User accounts in a web app",
        "Order history in an e-commerce DB",
        "Financial ledger records",
      ],
      keyTrait: "A relational table with typed columns enforces a rigid, predefined schema.",
    },
    wrongHints: {
      semi: "Not quite: SQL tables have a fixed schema with typed columns, not flexible keys.",
      unstructured: "Not quite: SQL data is highly structured: every column has a defined type.",
    },
  },
  {
    id: "excel",
    label: "Excel Spreadsheet",
    bucket: "structured",
    tooltip: {
      type: "Structured",
      examples: [
        "Financial models and budgets",
        "HR employee rosters",
        "Sales pipeline trackers",
      ],
      keyTrait: "Grid of cells with rows and columns: tabular by design.",
    },
    wrongHints: {
      semi: "Not quite: a spreadsheet grid has a row/column structure, not self-describing tags.",
      unstructured: "Not quite: spreadsheets are inherently tabular and structured.",
    },
  },
  // Semi-Structured
  {
    id: "json",
    label: "JSON API Response",
    bucket: "semi",
    tooltip: {
      type: "Semi-Structured",
      examples: [
        "REST API responses from web services",
        "Configuration files for apps",
        "NoSQL document store records",
      ],
      keyTrait: "Self-describing key-value pairs: flexible nesting without a fixed schema.",
    },
    wrongHints: {
      structured: "Not quite: JSON fields can be optional or nested, so there's no rigid schema.",
      unstructured: "Not quite: JSON has key-value structure with identifiable fields.",
    },
  },
  {
    id: "xml",
    label: "XML Configuration",
    bucket: "semi",
    tooltip: {
      type: "Semi-Structured",
      examples: [
        "Server configuration files",
        "RSS and Atom feeds",
        "SOAP web service messages",
      ],
      keyTrait: "Hierarchical tags give structure, but the schema is flexible and self-describing.",
    },
    wrongHints: {
      structured: "Not quite: XML tags are flexible and hierarchical, not fixed columns.",
      unstructured: "Not quite: XML has explicit tags and attributes that define its structure.",
    },
  },
  {
    id: "email",
    label: "Email with Metadata",
    bucket: "semi",
    tooltip: {
      type: "Semi-Structured",
      examples: [
        "Corporate email inboxes",
        "Customer support tickets",
        "Newsletter digests",
      ],
      keyTrait: "Structured headers (From, To, Date) combined with a freeform text body.",
    },
    wrongHints: {
      structured: "Not quite: the email body is freeform text, so it's not fully structured.",
      unstructured: "Not quite: emails have structured headers (From, To, Subject) alongside freeform content.",
    },
  },
  // Unstructured
  {
    id: "social",
    label: "Social Media Post",
    bucket: "unstructured",
    tooltip: {
      type: "Unstructured",
      examples: [
        "Twitter/X feeds and threads",
        "Instagram captions",
        "Reddit comments",
      ],
      keyTrait: "Freeform text and embedded media with no predefined schema.",
    },
    wrongHints: {
      structured: "Not quite: social posts are freeform text with no fixed columns or schema.",
      semi: "Not quite: social posts lack the self-describing key-value markers of semi-structured data.",
    },
  },
  {
    id: "audio",
    label: "Audio Waveform",
    bucket: "unstructured",
    tooltip: {
      type: "Unstructured",
      examples: [
        "Voice recordings and podcasts",
        "Call center audio logs",
        "Music tracks",
      ],
      keyTrait: "Raw binary signal data: meaning must be extracted by speech recognition or audio ML.",
    },
    wrongHints: {
      structured: "Not quite: an audio file is a raw binary signal with no column schema.",
      semi: "Not quite: audio data has no tags or keys describing its content.",
    },
  },
  {
    id: "photo",
    label: "Photograph",
    bucket: "unstructured",
    tooltip: {
      type: "Unstructured",
      examples: [
        "Medical imaging (X-rays, MRIs)",
        "Satellite imagery",
        "Product catalog photos",
      ],
      keyTrait: "A grid of pixels with no semantic schema: content must be inferred by computer vision.",
    },
    wrongHints: {
      structured: "Not quite: image pixels have no column schema; the content is encoded visually.",
      semi: "Not quite: image files have no meaningful keys describing what's in the picture.",
    },
  },
];

const BUCKETS: { id: BucketId; label: string; subtitle: string; color: string; icon: React.ReactNode }[] = [
  {
    id: "structured",
    label: "Structured",
    subtitle: "Rigid schema, rows & columns",
    color: "#93c5fd",
    icon: <Table2 size={16} />,
  },
  {
    id: "semi",
    label: "Semi-Structured",
    subtitle: "Flexible schema, tags & keys",
    color: "#d4af37",
    icon: <Braces size={16} />,
  },
  {
    id: "unstructured",
    label: "Unstructured",
    subtitle: "No predefined format",
    color: "#a855f7",
    icon: <Layers size={16} />,
  },
];

// ── Initial state ──────────────────────────────────────────────────────────

function buildInitialPlacements(): Record<string, ItemState> {
  return Object.fromEntries(
    DATA_ITEMS.map((item) => [item.id, { bucket: "source" as const, isCorrect: null }])
  );
}

function shuffleIds(): string[] {
  const ids = DATA_ITEMS.map((i) => i.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

// ── Particle helpers ───────────────────────────────────────────────────────

type Particle = { id: number; x: number; y: number; color: string; dx: number; dy: number };

function generateParticles(): Particle[] {
  const colors = ["var(--color-accent)", "#3bb4a4", "#93c5fd", "#a855f7", "#f1f5f9"];
  return Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: 40 + Math.random() * 60, // percent
    y: 20 + Math.random() * 60,
    color: colors[i % colors.length],
    dx: (Math.random() - 0.5) * 80,
    dy: -(30 + Math.random() * 60),
  }));
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function WhatIsDataClient() {
  const { data: session } = useSession();

  const [placements, setPlacements] = useState<Record<string, ItemState>>(buildInitialPlacements);
  const [shuffledIds, setShuffledIds] = useState<string[]>(shuffleIds);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [overBucketId, setOverBucketId] = useState<BucketId | null>(null);
  const [errorBucketId, setErrorBucketId] = useState<BucketId | null>(null);
  const [errorItemId, setErrorItemId] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null); // keyboard
  const [keyFocusBucket, setKeyFocusBucket] = useState<BucketId | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [liveMessage, setLiveMessage] = useState("");

  const completionFired = useRef(false);
  const bucketRefs = useRef<Record<BucketId, React.RefObject<HTMLDivElement | null>>>({
    structured: React.createRef(),
    semi: React.createRef(),
    unstructured: React.createRef(),
  });

  // Derived state
  const correctCount = Object.values(placements).filter((p) => p.isCorrect === true).length;
  const allCorrect = correctCount === DATA_ITEMS.length;

  // Completion effect
  useEffect(() => {
    if (allCorrect && !completionFired.current) {
      completionFired.current = true;
      setParticles(generateParticles());
      setLiveMessage("Excellent! All 9 items sorted correctly. Guide complete!");
      const timer = setTimeout(() => setShowSummary(true), 900);
      if (session?.user) {
        fetch("/api/visual-guides/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideSlug: "what-is-data", score: 100 }),
        }).catch(() => {});
      }
      return () => clearTimeout(timer);
    }
  }, [allCorrect, session?.user]);

  // ── Drop logic ─────────────────────────────────────────────────────────

  const attemptDrop = useCallback((itemId: string, targetBucket: BucketId) => {
    const item = DATA_ITEMS.find((i) => i.id === itemId);
    if (!item) return;

    if (item.bucket === targetBucket) {
      setPlacements((prev) => ({
        ...prev,
        [itemId]: { bucket: targetBucket, isCorrect: true },
      }));
      setLiveMessage(`${item.label} correctly placed in ${targetBucket}.`);
    } else {
      const hint = item.wrongHints[targetBucket] ?? "Not quite: try a different bucket.";
      setErrorBucketId(targetBucket);
      setErrorItemId(itemId);
      setErrorHint(hint);
      setLiveMessage(hint);
      setTimeout(() => {
        setErrorBucketId(null);
        setErrorItemId(null);
        setErrorHint(null);
      }, 1800);
    }
  }, []);

  // ── Pointer-based drag ─────────────────────────────────────────────────

  const handlePointerDown = useCallback((e: React.PointerEvent, id: string) => {
    if (placements[id].bucket !== "source") return;
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDragPos({ x: e.clientX, y: e.clientY });
    setDraggingId(id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [placements]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingId) return;
    setDragPos({ x: e.clientX, y: e.clientY });

    // Hit test buckets
    let found: BucketId | null = null;
    for (const bucket of BUCKETS) {
      const ref = bucketRefs.current[bucket.id];
      if (ref?.current) {
        const r = ref.current.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          found = bucket.id;
          break;
        }
      }
    }
    setOverBucketId(found);
  }, [draggingId]);

  const handlePointerUp = useCallback(() => {
    if (draggingId && overBucketId) {
      attemptDrop(draggingId, overBucketId);
    }
    setDraggingId(null);
    setOverBucketId(null);
  }, [draggingId, overBucketId, attemptDrop]);

  // ── Keyboard drag ──────────────────────────────────────────────────────

  const handleKeyAction = useCallback((itemId: string) => {
    if (selectedItemId === itemId) {
      // deselect
      setSelectedItemId(null);
      setKeyFocusBucket(null);
    } else {
      setSelectedItemId(itemId);
    }
  }, [selectedItemId]);

  const handleKeyDrop = useCallback((bucketId: BucketId) => {
    if (!selectedItemId) return;
    attemptDrop(selectedItemId, bucketId);
    setSelectedItemId(null);
    setKeyFocusBucket(null);
  }, [selectedItemId, attemptDrop]);

  // ── Reset ──────────────────────────────────────────────────────────────

  function reset() {
    setPlacements(buildInitialPlacements());
    setShuffledIds(shuffleIds());
    setShowSummary(false);
    setParticles([]);
    setErrorBucketId(null);
    setErrorItemId(null);
    setErrorHint(null);
    setSelectedItemId(null);
    completionFired.current = false;
  }

  // ── Sorted items per bucket ────────────────────────────────────────────

  const sortedByBucket = (bucketId: BucketId) =>
    DATA_ITEMS.filter((item) => placements[item.id].bucket === bucketId && placements[item.id].isCorrect);

  const sourceItems = shuffledIds
    .map((id) => DATA_ITEMS.find((i) => i.id === id)!)
    .filter((item) => placements[item.id].bucket === "source");

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen pb-20"
      onPointerMove={draggingId ? handlePointerMove : undefined}
      onPointerUp={draggingId ? handlePointerUp : undefined}
    >
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white">What Is Data?</span>
        </nav>

        {/* Hero */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              Data &amp; Analysis
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            What Is Data?{" "}
            <span className="text-[var(--color-accent)]">Types &amp; Structures</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[560px]">
            Drag each data sample into the right bucket. Learn to tell structured from
            unstructured data, by doing.
          </p>
        </section>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="relative h-1.5 rounded-full bg-[#1e293b] overflow-hidden">
            <motion.div
              className="absolute left-0 top-0 h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, #1e5d8a, #3bb4a4, var(--color-accent))",
              }}
              initial={{ width: "0%" }}
              animate={{ width: `${(correctCount / DATA_ITEMS.length) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-[12px] text-[#94a3b8]">
              {correctCount} of {DATA_ITEMS.length} sorted
            </p>
            {!session?.user && (
              <p className="text-[11px] text-[#475569]">
                <Link href="/auth/sign-in" className="hover:text-[#94a3b8] transition-colors underline underline-offset-2">
                  Sign in
                </Link>{" "}
                to track your progress
              </p>
            )}
          </div>
        </div>

        {/* Hint toast */}
        <AnimatePresence>
          {errorHint && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 px-4 py-2.5 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 text-[12px] text-[#ef4444]"
            >
              {errorHint}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Keyboard selection hint */}
        <AnimatePresence>
          {selectedItemId && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 px-4 py-2.5 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 text-[12px] text-[var(--color-accent)]"
            >
              <strong>{DATA_ITEMS.find((i) => i.id === selectedItemId)?.label}</strong> selected.
              Tab to a bucket and press Enter/Space to drop. Press Escape to cancel.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Interactive canvas */}
        <div className="min-h-[600px]">

          {/* Source items grid */}
          {sourceItems.length > 0 && (
            <div className="mb-8">
              {/* Desktop 3×3 grid */}
              <div
                className="hidden sm:grid gap-4"
                style={{ gridTemplateColumns: "repeat(3, 200px)" }}
              >
                {sourceItems.map((item) => (
                  <DataItem
                    key={item.id}
                    item={item}
                    state={placements[item.id]}
                    isDragging={draggingId === item.id}
                    isSelected={selectedItemId === item.id}
                    isError={errorItemId === item.id}
                    onPointerDown={handlePointerDown}
                    onKeyAction={handleKeyAction}
                  />
                ))}
              </div>

              {/* Mobile horizontal scroll strip */}
              <div className="flex sm:hidden gap-3 overflow-x-auto pb-3 -mx-5 px-5 snap-x snap-mandatory">
                {sourceItems.map((item) => (
                  <div key={item.id} className="flex-shrink-0 snap-start">
                    <DataItem
                      item={item}
                      state={placements[item.id]}
                      isDragging={draggingId === item.id}
                      isSelected={selectedItemId === item.id}
                      isError={errorItemId === item.id}
                      onPointerDown={handlePointerDown}
                      onKeyAction={handleKeyAction}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Buckets */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {BUCKETS.map((bucket) => (
              <CategoryBucket
                key={bucket.id}
                id={bucket.id}
                label={bucket.label}
                subtitle={bucket.subtitle}
                color={bucket.color}
                icon={bucket.icon}
                sortedItems={sortedByBucket(bucket.id)}
                isOver={overBucketId === bucket.id}
                isError={errorBucketId === bucket.id}
                isKeyTarget={selectedItemId !== null}
                onKeyDrop={handleKeyDrop}
                bucketRef={bucketRefs.current[bucket.id]}
              />
            ))}
          </div>

          {/* Summary card */}
          <AnimatePresence>
            {showSummary && <SummaryCard onReset={reset} />}
          </AnimatePresence>
        </div>

        {/* Particle burst */}
        {particles.length > 0 && (
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ x: `${p.x}vw`, y: `${p.y}vh`, scale: 1, opacity: 1 }}
                animate={{
                  x: `calc(${p.x}vw + ${p.dx}px)`,
                  y: `calc(${p.y}vh + ${p.dy}px)`,
                  scale: 0,
                  opacity: 0,
                }}
                transition={{ duration: 1.2, delay: p.id * 0.02, ease: "easeOut" }}
                onAnimationComplete={() => {
                  if (p.id === particles.length - 1) setParticles([]);
                }}
                className="absolute w-2 h-2 rounded-full"
                style={{ background: p.color }}
              />
            ))}
          </div>
        )}

        {/* Ghost element during drag */}
        {draggingId && (() => {
          const item = DATA_ITEMS.find((i) => i.id === draggingId);
          if (!item) return null;
          return (
            <div
              className="fixed pointer-events-none z-[100]"
              style={{
                left: dragPos.x - dragOffset.x,
                top: dragPos.y - dragOffset.y,
                width: 200,
                minHeight: 140,
                transform: "rotate(2deg)",
                opacity: 0.9,
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              }}
            >
              <DataItem
                item={item}
                state={{ bucket: "source", isCorrect: null }}
                isDragging
                isSelected={false}
                isError={false}
                onPointerDown={() => {}}
                onKeyAction={() => {}}
              />
            </div>
          );
        })()}

        {/* ARIA live region */}
        <div aria-live="polite" className="sr-only">
          {liveMessage}
        </div>
      </div>
    </div>
  );
}
