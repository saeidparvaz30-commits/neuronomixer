"use client";

import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useState, useRef, useEffect } from "react";
import { AlignLeft, AlignCenter, AlignRight, Maximize2, Type } from "lucide-react";

type Alignment = "full" | "left" | "center" | "right";

const ALIGNMENT_OPTIONS: {
  value: Alignment;
  Icon: React.FC<{ size?: number }>;
  label: string;
}[] = [
  { value: "full",   Icon: Maximize2,   label: "Full width" },
  { value: "left",   Icon: AlignLeft,   label: "Float left — text wraps right" },
  { value: "center", Icon: AlignCenter, label: "Center" },
  { value: "right",  Icon: AlignRight,  label: "Float right — text wraps left" },
];

export function ImageNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const { src, alt, width, alignment = "full" } = node.attrs as {
    src: string;
    alt?: string;
    width?: number;
    alignment?: Alignment;
    assetId?: string;
  };

  const [showAlt, setShowAlt] = useState(false);
  const [altValue, setAltValue] = useState(alt ?? "");
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeStartX = useRef(0);
  const resizeStartW = useRef(0);

  // Sync external alt changes
  useEffect(() => { setAltValue(alt ?? ""); }, [alt]);

  // ── Resize logic ────────────────────────────────────────────────────────
  function startResize(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartX.current = e.clientX;
    resizeStartW.current = containerRef.current?.offsetWidth ?? (width ?? 400);
  }

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeStartX.current;
      const newW = Math.max(80, resizeStartW.current + dx);
      updateAttributes({ width: Math.round(newW) });
    };
    const onUp = () => setIsResizing(false);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [isResizing, updateAttributes]);

  // ── Outer wrapper style (controls float / centering) ───────────────────
  const wrapperStyle: React.CSSProperties = (() => {
    const w = alignment === "full" ? "100%" : `${width ?? 400}px`;
    switch (alignment) {
      case "left":
        return {
          float: "left",
          width: w,
          maxWidth: "65%",
          marginRight: "1.5rem",
          marginBottom: "0.5rem",
          marginTop: "0.25rem",
          position: "relative",
        };
      case "right":
        return {
          float: "right",
          width: w,
          maxWidth: "65%",
          marginLeft: "1.5rem",
          marginBottom: "0.5rem",
          marginTop: "0.25rem",
          position: "relative",
        };
      case "center":
        return {
          display: "block",
          width: w,
          margin: "1rem auto",
          clear: "both",
          position: "relative",
        };
      default: // full
        return {
          display: "block",
          width: "100%",
          margin: "1rem 0",
          clear: "both",
          position: "relative",
        };
    }
  })();

  const canResize = alignment !== "full";

  return (
    <NodeViewWrapper style={wrapperStyle} contentEditable={false}>
      <div
        ref={containerRef}
        style={{ position: "relative", lineHeight: 0, userSelect: "none" }}
        className={
          selected
            ? "ring-2 ring-[var(--color-accent)] rounded-xl ring-offset-2 ring-offset-[#111827]"
            : ""
        }
      >
        {/* ── Image ──────────────────────────────────────────────────────── */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={altValue}
          draggable={false}
          className="w-full h-auto rounded-xl block"
        />

        {/* ── Alignment + alt toolbar (top overlay, visible when selected) ─ */}
        {selected && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-gray-900/95 border border-white/20 rounded-lg px-1.5 py-1 shadow-xl z-50 whitespace-nowrap">
            {ALIGNMENT_OPTIONS.map(({ value, Icon, label }) => (
              <button
                key={value}
                type="button"
                title={label}
                onMouseDown={(e) => {
                  e.preventDefault();
                  updateAttributes({
                    alignment: value,
                    // Keep current width for positioned modes; clear for full
                    width: value === "full" ? null : (width ?? 400),
                  });
                }}
                className={`p-1.5 rounded transition-colors ${
                  alignment === value
                    ? "bg-[var(--color-accent)] text-black"
                    : "text-gray-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon size={13} />
              </button>
            ))}

            <div className="w-px h-4 bg-white/20 mx-1" />

            {/* Alt text toggle */}
            <button
              type="button"
              title="Edit alt text"
              onMouseDown={(e) => { e.preventDefault(); setShowAlt((v) => !v); }}
              className={`p-1.5 rounded transition-colors ${
                showAlt
                  ? "bg-[var(--color-accent)] text-black"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <Type size={13} />
            </button>
          </div>
        )}

        {/* ── Alt text input (bottom overlay) ────────────────────────────── */}
        {selected && showAlt && (
          <div className="absolute bottom-2 left-2 right-12 flex items-center gap-2 bg-gray-900/95 border border-white/20 rounded-lg px-2 py-1.5 z-50">
            <span className="text-[10px] text-gray-400 shrink-0 font-medium">ALT</span>
            <input
              type="text"
              value={altValue}
              onChange={(e) => {
                setAltValue(e.target.value);
                updateAttributes({ alt: e.target.value });
              }}
              placeholder="Describe this image for accessibility…"
              className="flex-1 bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none"
            />
          </div>
        )}

        {/* ── Resize handle (right edge, hidden for full-width) ──────────── */}
        {selected && canResize && (
          <div
            onMouseDown={startResize}
            className="absolute right-0 top-0 h-full w-5 flex items-center justify-end cursor-ew-resize z-40"
          >
            <div className="w-1.5 h-10 bg-[var(--color-accent)] rounded-full opacity-70 hover:opacity-100 transition-opacity shadow-lg mr-0.5" />
          </div>
        )}

        {/* ── Width indicator (shown while resizing) ─────────────────────── */}
        {isResizing && width && (
          <div className="absolute top-2 right-2 bg-gray-900/90 text-[var(--color-accent)] text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/10 z-50">
            {width}px
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
