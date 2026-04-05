"use client";

import React, { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Point, DetectionMethod, mean, stdDev, quartiles, regression } from "./types";

const W = 480, H = 380;
const PAD = { l: 44, r: 24, t: 20, b: 44 };
const IW = W - PAD.l - PAD.r;
const IH = H - PAD.t - PAD.b;

const toSvgX = (v: number) => PAD.l + (v / 100) * IW;
const toSvgY = (v: number) => PAD.t + (1 - v / 100) * IH;
const fromSvgX = (px: number) => Math.max(0, Math.min(100, ((px - PAD.l) / IW) * 100));
const fromSvgY = (py: number) => Math.max(0, Math.min(100, (1 - (py - PAD.t) / IH) * 100));

type Props = {
  points: Point[];
  onMovePoint: (id: number, x: number, y: number) => void;
  onAddPoint: (x: number, y: number) => void;
  onRemovePoint: (id: number) => void;
  outlierIds: Set<number>;
  method: DetectionMethod;
  threshold: number;
};

export default function InteractiveScatter({
  points, onMovePoint, onAddPoint, onRemovePoint, outlierIds, method, threshold,
}: Props) {
  const svgRef     = useRef<SVGSVGElement>(null);
  const dragIdRef  = useRef<number | null>(null);
  const lastTapRef = useRef<{ id: number; time: number } | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [localPos,   setLocalPos]   = useState<{ x: number; y: number } | null>(null);
  const [hoverId,    setHoverId]    = useState<number | null>(null);

  const getSvgCoords = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return null;
    const rect  = svgRef.current.getBoundingClientRect();
    const svgX  = (clientX - rect.left) * (W / rect.width);
    const svgY  = (clientY - rect.top)  * (H / rect.height);
    return { svgX, svgY, x: fromSvgX(svgX), y: fromSvgY(svgY) };
  }, []);

  const handleCirclePointerDown = useCallback((e: React.PointerEvent, id: number) => {
    e.stopPropagation();
    e.preventDefault();

    // Double-tap to remove
    const now = Date.now();
    if (lastTapRef.current?.id === id && now - lastTapRef.current.time < 400) {
      lastTapRef.current = null;
      onRemovePoint(id);
      return;
    }
    lastTapRef.current = { id, time: now };

    dragIdRef.current = id;
    setDraggingId(id);
    const pt = points.find(p => p.id === id);
    if (pt) setLocalPos({ x: pt.x, y: pt.y });

    function onMove(ev: PointerEvent) {
      const c = getSvgCoords(ev.clientX, ev.clientY);
      if (c) setLocalPos({ x: c.x, y: c.y });
    }
    function onUp(ev: PointerEvent) {
      const cid = dragIdRef.current;
      dragIdRef.current = null;
      setDraggingId(null);
      setLocalPos(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (cid === null) return;
      const c = getSvgCoords(ev.clientX, ev.clientY);
      if (c) onMovePoint(cid, Math.round(c.x), Math.round(c.y));
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [points, onRemovePoint, onMovePoint, getSvgCoords]);

  function handleSvgClick(e: React.MouseEvent) {
    if (draggingId !== null) return;
    const tag = (e.target as Element).tagName.toLowerCase();
    if (tag === "circle") return;
    const c = getSvgCoords(e.clientX, e.clientY);
    if (!c) return;
    if (c.svgX < PAD.l || c.svgX > W - PAD.r || c.svgY < PAD.t || c.svgY > H - PAD.b) return;
    onAddPoint(Math.round(c.x), Math.round(c.y));
  }

  // Computed stat lines
  const xs   = points.map(p => p.x);
  const mx   = xs.length > 0 ? mean(xs) : 50;
  const sdX  = xs.length > 1 ? stdDev(xs, mx) : 0;
  const medX = (() => {
    if (!xs.length) return 50;
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
  })();
  const { q1, q3, iqr } = xs.length > 3 ? quartiles(xs) : { q1: 25, q3: 75, iqr: 50 };
  const reg = points.length > 1 ? regression(points) : null;

  const zLo   = mx - threshold * sdX;
  const zHi   = mx + threshold * sdX;
  const iqrLo = q1 - 1.5 * iqr;
  const iqrHi = q3 + 1.5 * iqr;

  const clamp  = (v: number) => Math.max(0, Math.min(100, v));
  const ticks  = [0, 20, 40, 60, 80, 100];
  const outlierColor = method === "zscore" ? "#ef4444" : "#f97316";

  return (
    <div>
      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        className="block select-none"
        style={{ cursor: draggingId !== null ? "grabbing" : "crosshair", touchAction: "none" }}
        onClick={handleSvgClick}
        role="img"
        aria-label="Interactive scatter plot for outlier detection"
      >
        {/* Grid */}
        {ticks.map(v => (
          <React.Fragment key={v}>
            <line x1={toSvgX(v)} y1={PAD.t} x2={toSvgX(v)} y2={PAD.t + IH} stroke="#1e293b" strokeWidth="1" />
            <line x1={PAD.l} y1={toSvgY(v)} x2={PAD.l + IW} y2={toSvgY(v)} stroke="#1e293b" strokeWidth="1" />
          </React.Fragment>
        ))}

        {/* Axes */}
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + IH} stroke="#334155" strokeWidth="1.5" />
        <line x1={PAD.l} y1={PAD.t + IH} x2={PAD.l + IW} y2={PAD.t + IH} stroke="#334155" strokeWidth="1.5" />

        {/* Tick labels */}
        {ticks.map(v => (
          <React.Fragment key={`tl-${v}`}>
            <text x={toSvgX(v)} y={PAD.t + IH + 14} textAnchor="middle" fontSize="8" fill="#475569" fontFamily="Inter,sans-serif">{v}</text>
            {v > 0 && <text x={PAD.l - 6} y={toSvgY(v) + 3} textAnchor="end" fontSize="8" fill="#475569" fontFamily="Inter,sans-serif">{v}</text>}
          </React.Fragment>
        ))}

        {/* Axis labels */}
        <text x={PAD.l + IW / 2} y={H - 4} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="Inter,sans-serif">X Value</text>
        <text x={12} y={PAD.t + IH / 2} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="Inter,sans-serif" transform={`rotate(-90,12,${PAD.t + IH / 2})`}>Y Value</text>

        {/* Z-score shading + fence lines */}
        {method === "zscore" && sdX > 0 && (
          <>
            {zLo > 0  && <rect x={PAD.l} y={PAD.t} width={Math.max(0, toSvgX(clamp(zLo)) - PAD.l)} height={IH} fill="#ef4444" opacity="0.05" />}
            {zHi < 100 && <rect x={toSvgX(clamp(zHi))} y={PAD.t} width={Math.max(0, PAD.l + IW - toSvgX(clamp(zHi)))} height={IH} fill="#ef4444" opacity="0.05" />}
            {zLo > 0  && <line x1={toSvgX(clamp(zLo))} y1={PAD.t} x2={toSvgX(clamp(zLo))} y2={PAD.t + IH} stroke="#ef4444" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />}
            {zHi < 100 && <line x1={toSvgX(clamp(zHi))} y1={PAD.t} x2={toSvgX(clamp(zHi))} y2={PAD.t + IH} stroke="#ef4444" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />}
          </>
        )}

        {/* IQR shading + fence lines */}
        {method === "iqr" && (
          <>
            <rect x={toSvgX(clamp(q1))} y={PAD.t} width={Math.max(0, toSvgX(clamp(q3)) - toSvgX(clamp(q1)))} height={IH} fill="#f97316" opacity="0.04" />
            {iqrLo > 0  && <rect x={PAD.l} y={PAD.t} width={Math.max(0, toSvgX(clamp(iqrLo)) - PAD.l)} height={IH} fill="#f97316" opacity="0.05" />}
            {iqrHi < 100 && <rect x={toSvgX(clamp(iqrHi))} y={PAD.t} width={Math.max(0, PAD.l + IW - toSvgX(clamp(iqrHi)))} height={IH} fill="#f97316" opacity="0.05" />}
            {iqrLo > 0  && <line x1={toSvgX(clamp(iqrLo))} y1={PAD.t} x2={toSvgX(clamp(iqrLo))} y2={PAD.t + IH} stroke="#f97316" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />}
            {iqrHi < 100 && <line x1={toSvgX(clamp(iqrHi))} y1={PAD.t} x2={toSvgX(clamp(iqrHi))} y2={PAD.t + IH} stroke="#f97316" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />}
          </>
        )}

        {/* Regression line */}
        {reg && (
          <line
            x1={toSvgX(0)}   y1={toSvgY(reg.intercept)}
            x2={toSvgX(100)} y2={toSvgY(reg.intercept + reg.slope * 100)}
            stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="6 3" opacity="0.7"
          />
        )}

        {/* Mean X vertical */}
        <line x1={toSvgX(mx)}   y1={PAD.t} x2={toSvgX(mx)}   y2={PAD.t + IH} stroke="#3bb4a4" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.85" />
        {/* Median X vertical */}
        <line x1={toSvgX(medX)} y1={PAD.t} x2={toSvgX(medX)} y2={PAD.t + IH} stroke="#d4af37" strokeWidth="1.5" opacity="0.85" />

        {/* Data points */}
        {points.map(pt => {
          const isOutlier  = outlierIds.has(pt.id);
          const isDragging = draggingId === pt.id;
          const isHov      = hoverId === pt.id && !isDragging;
          const px         = isDragging && localPos ? toSvgX(localPos.x) : toSvgX(pt.x);
          const py         = isDragging && localPos ? toSvgY(localPos.y) : toSvgY(pt.y);
          const color      = isOutlier ? outlierColor : "#3bb4a4";
          const r          = isHov || isDragging ? 8 : 6;

          return (
            <g key={pt.id}>
              {/* Pulsing ring for outliers */}
              {isOutlier && !isDragging && (
                <circle cx={px} cy={py} r={12} fill="none" stroke={color} strokeWidth="1.5" opacity="0.3">
                  <animate attributeName="r"       values="11;15;11" dur="1.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.3;0.08;0.3" dur="1.5s" repeatCount="indefinite" />
                </circle>
              )}

              <motion.circle
                cx={px} cy={py} r={r}
                fill={color}
                stroke={isOutlier ? color : isHov ? "#d4af37" : "rgba(255,255,255,0.2)"}
                strokeWidth={isOutlier || isHov ? 2 : 1}
                animate={{ cx: px, cy: py, r }}
                transition={isDragging ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 30 }}
                style={{ cursor: isDragging ? "grabbing" : "grab" }}
                onPointerDown={(e) => handleCirclePointerDown(e as unknown as React.PointerEvent, pt.id)}
                onMouseEnter={() => setHoverId(pt.id)}
                onMouseLeave={() => setHoverId(null)}
              >
                <title>{`(${pt.x}, ${pt.y})${isOutlier ? " — outlier" : ""}`}</title>
              </motion.circle>

              {/* Hover tooltip */}
              {isHov && (
                <g style={{ pointerEvents: "none" }}>
                  <rect x={px - 54} y={py - 46} width="108" height="34" rx="5" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                  <text x={px} y={py - 30} textAnchor="middle" fontSize="9" fill="#f1f5f9" fontFamily="Inter,sans-serif">
                    ({pt.x}, {pt.y}) {isOutlier ? "⚠" : ""}
                  </text>
                  <text x={px} y={py - 19} textAnchor="middle" fontSize="7.5" fill="#94a3b8" fontFamily="Inter,sans-serif">
                    drag · double-click to remove
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Legend */}
        <g style={{ pointerEvents: "none" }}>
          <circle cx={PAD.l + 6}   cy={H - 10} r="4" fill="#3bb4a4" />
          <text   x={PAD.l + 14}  y={H - 7} fontSize="8" fill="#94a3b8" fontFamily="Inter,sans-serif">Normal</text>
          <circle cx={PAD.l + 60}  cy={H - 10} r="4" fill={outlierColor} />
          <text   x={PAD.l + 68}  y={H - 7} fontSize="8" fill="#94a3b8" fontFamily="Inter,sans-serif">Outlier</text>
          <line x1={PAD.l + 114} y1={H - 10} x2={PAD.l + 128} y2={H - 10} stroke="#3bb4a4" strokeWidth="1.5" strokeDasharray="5 3" />
          <text   x={PAD.l + 132} y={H - 7} fontSize="8" fill="#94a3b8" fontFamily="Inter,sans-serif">Mean X</text>
          <line x1={PAD.l + 180} y1={H - 10} x2={PAD.l + 194} y2={H - 10} stroke="#d4af37" strokeWidth="1.5" />
          <text   x={PAD.l + 198} y={H - 7} fontSize="8" fill="#94a3b8" fontFamily="Inter,sans-serif">Median X</text>
          <line x1={PAD.l + 254} y1={H - 10} x2={PAD.l + 268} y2={H - 10} stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="6 3" />
          <text   x={PAD.l + 272} y={H - 7} fontSize="8" fill="#94a3b8" fontFamily="Inter,sans-serif">Trend</text>
        </g>
      </svg>
      <p className="text-[10px] text-[#475569] mt-1 text-center">Drag to move · click empty area to add · double-click to remove</p>
    </div>
  );
}
