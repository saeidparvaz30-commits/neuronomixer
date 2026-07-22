"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  Pt,
  GNBFit,
  DOMAIN,
  gnbPosterior,
  contourSegments,
} from "./nbMath";

interface Props {
  hamPts: Pt[];
  spamPts: Pt[];
  fit: GNBFit;
  onMovePoint: (cls: "spam" | "ham", idx: number, x: number, y: number) => void;
}

const W = 560;
const H = 436;
const ML = 42;
const MR = 18;
const MT = 18;
const MB = 54;
const PW = W - ML - MR;
const PH = H - MT - MB;

const sx = (x: number) => ML + ((x - DOMAIN.x0) / (DOMAIN.x1 - DOMAIN.x0)) * PW;
const sy = (y: number) => MT + PH - ((y - DOMAIN.y0) / (DOMAIN.y1 - DOMAIN.y0)) * PH;

const KEY_STEP = 0.25;

/** Coarse cells for the predicted-region tint behind the boundary. */
const SHADE_NX = 28;
const SHADE_NY = 21;

interface Selected {
  cls: "spam" | "ham";
  idx: number;
}

export default function GaussianNBLab({ hamPts, spamPts, fit, onMovePoint }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<Selected | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);

  const segments = useMemo(() => contourSegments(fit, 56, 42), [fit]);

  const shadeCells = useMemo(() => {
    const cells: { x: number; y: number; w: number; h: number; spam: boolean }[] = [];
    const cw = PW / SHADE_NX;
    const ch = PH / SHADE_NY;
    for (let j = 0; j < SHADE_NY; j++) {
      for (let i = 0; i < SHADE_NX; i++) {
        const px = ML + i * cw;
        const py = MT + j * ch;
        const dataX = DOMAIN.x0 + ((i + 0.5) / SHADE_NX) * (DOMAIN.x1 - DOMAIN.x0);
        const dataY = DOMAIN.y1 - ((j + 0.5) / SHADE_NY) * (DOMAIN.y1 - DOMAIN.y0);
        cells.push({ x: px, y: py, w: cw, h: ch, spam: gnbPosterior(dataX, dataY, fit) >= 0.5 });
      }
    }
    return cells;
  }, [fit]);

  const toData = (e: React.PointerEvent): { x: number; y: number } => {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;
    return {
      x: DOMAIN.x0 + ((px - ML) / PW) * (DOMAIN.x1 - DOMAIN.x0),
      y: DOMAIN.y0 + ((MT + PH - py) / PH) * (DOMAIN.y1 - DOMAIN.y0),
    };
  };

  const handlePointerDown = (cls: "spam" | "ham", idx: number) => (e: React.PointerEvent) => {
    dragRef.current = { cls, idx };
    setSelected({ cls, idx });
    svgRef.current?.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const { x, y } = toData(e);
    onMovePoint(drag.cls, drag.idx, x, y);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    if (svgRef.current?.hasPointerCapture(e.pointerId)) {
      svgRef.current.releasePointerCapture(e.pointerId);
    }
  };

  const handleKeyDown = (cls: "spam" | "ham", idx: number, p: Pt) => (
    e: React.KeyboardEvent
  ) => {
    let dx = 0;
    let dy = 0;
    if (e.key === "ArrowLeft") dx = -KEY_STEP;
    else if (e.key === "ArrowRight") dx = KEY_STEP;
    else if (e.key === "ArrowUp") dy = KEY_STEP;
    else if (e.key === "ArrowDown") dy = -KEY_STEP;
    else return;
    e.preventDefault();
    setSelected({ cls, idx });
    onMovePoint(cls, idx, p.x + dx, p.y + dy);
  };

  const selectedPt =
    selected === null
      ? null
      : (selected.cls === "spam" ? spamPts : hamPts)[selected.idx];
  const selectedPosterior =
    selectedPt === null ? null : gnbPosterior(selectedPt.x, selectedPt.y, fit);

  const gridTicks = [0, 2, 4, 6, 8, 10];

  const fitRows = (
    [
      { label: "ham", cls: fit.ham, color: "#3bb4a4" },
      { label: "spam", cls: fit.spam, color: "var(--color-warning)" },
    ] as const
  );

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div className="rounded-xl border border-[#1e293b] bg-[#0b1222] p-2">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto touch-none select-none"
            role="img"
            aria-label="Scatter plot of ham and spam training points with fitted Gaussian ellipses and the naive Bayes decision boundary"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* Predicted-region tint */}
            {shadeCells.map((c, i) => (
              <rect
                key={i}
                x={c.x.toFixed(2)}
                y={c.y.toFixed(2)}
                width={c.w.toFixed(2)}
                height={c.h.toFixed(2)}
                fill={c.spam ? "var(--color-warning)" : "#3bb4a4"}
                fillOpacity={c.spam ? 0.045 : 0.055}
              />
            ))}

            {/* Grid + axes */}
            {gridTicks.map((t) => (
              <g key={t}>
                <line
                  x1={sx(t).toFixed(2)}
                  y1={MT}
                  x2={sx(t).toFixed(2)}
                  y2={MT + PH}
                  stroke="#1e293b"
                  strokeWidth={1}
                />
                <line
                  x1={ML}
                  y1={sy(t).toFixed(2)}
                  x2={ML + PW}
                  y2={sy(t).toFixed(2)}
                  stroke="#1e293b"
                  strokeWidth={1}
                />
                <text
                  x={sx(t).toFixed(2)}
                  y={MT + PH + 18}
                  textAnchor="middle"
                  fill="#475569"
                  fontSize={17}
                >
                  {t}
                </text>
                <text
                  x={ML - 6}
                  y={(sy(t) + 6).toFixed(2)}
                  textAnchor="end"
                  fill="#475569"
                  fontSize={17}
                >
                  {t}
                </text>
              </g>
            ))}
            <text
              x={(ML + PW / 2).toFixed(2)}
              y={H - 8}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize={18}
            >
              feature x1: exclamations per 100 words
            </text>
            <text
              x={15}
              y={(MT + PH / 2).toFixed(2)}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize={18}
              transform={`rotate(-90 15 ${(MT + PH / 2).toFixed(2)})`}
            >
              feature x2: links per message
            </text>

            {/* Class-conditional ellipses (axis aligned: diagonal covariance) */}
            {fitRows.map(({ label, cls, color }) => (
              <g key={label}>
                {[1, 2].map((k) => (
                  <ellipse
                    key={k}
                    cx={sx(cls.mean[0]).toFixed(2)}
                    cy={sy(cls.mean[1]).toFixed(2)}
                    rx={((k * Math.sqrt(cls.variance[0]) * PW) / (DOMAIN.x1 - DOMAIN.x0)).toFixed(2)}
                    ry={((k * Math.sqrt(cls.variance[1]) * PH) / (DOMAIN.y1 - DOMAIN.y0)).toFixed(2)}
                    fill="none"
                    stroke={color}
                    strokeWidth={k === 1 ? 1.5 : 1}
                    strokeOpacity={k === 1 ? 0.65 : 0.35}
                    strokeDasharray={k === 2 ? "4 4" : undefined}
                  />
                ))}
                {/* Mean cross */}
                <line
                  x1={(sx(cls.mean[0]) - 5).toFixed(2)}
                  y1={sy(cls.mean[1]).toFixed(2)}
                  x2={(sx(cls.mean[0]) + 5).toFixed(2)}
                  y2={sy(cls.mean[1]).toFixed(2)}
                  stroke={color}
                  strokeWidth={1.5}
                />
                <line
                  x1={sx(cls.mean[0]).toFixed(2)}
                  y1={(sy(cls.mean[1]) - 5).toFixed(2)}
                  x2={sx(cls.mean[0]).toFixed(2)}
                  y2={(sy(cls.mean[1]) + 5).toFixed(2)}
                  stroke={color}
                  strokeWidth={1.5}
                />
                <text
                  x={(sx(cls.mean[0]) + 8).toFixed(2)}
                  y={(sy(cls.mean[1]) - 8).toFixed(2)}
                  fill={color}
                  fontSize={18}
                  fontWeight={700}
                >
                  {label} mean
                </text>
              </g>
            ))}

            {/* Decision boundary */}
            {segments.length > 0 && (
              <path
                d={segments
                  .map(
                    ([ax, ay, bx, by]) =>
                      `M${sx(ax).toFixed(2)} ${sy(ay).toFixed(2)} L${sx(bx).toFixed(2)} ${sy(by).toFixed(2)}`
                  )
                  .join(" ")}
                stroke="var(--color-accent)"
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
              />
            )}

            {/* Points: ham circles, spam diamonds. Focusable and draggable. */}
            {hamPts.map((p, i) => {
              const isSel = selected?.cls === "ham" && selected.idx === i;
              return (
                <g
                  key={`h${i}`}
                  tabIndex={0}
                  role="button"
                  aria-label={`Ham point ${i + 1} at x ${p.x.toFixed(2)}, y ${p.y.toFixed(2)}. Use arrow keys to move it.`}
                  onPointerDown={handlePointerDown("ham", i)}
                  onKeyDown={handleKeyDown("ham", i, p)}
                  onFocus={() => setSelected({ cls: "ham", idx: i })}
                  className="cursor-grab focus:outline-none"
                >
                  <circle
                    cx={sx(p.x).toFixed(2)}
                    cy={sy(p.y).toFixed(2)}
                    r={12}
                    fill="transparent"
                  />
                  <circle
                    cx={sx(p.x).toFixed(2)}
                    cy={sy(p.y).toFixed(2)}
                    r={6}
                    fill="#3bb4a4"
                    stroke={isSel ? "#f1f5f9" : "#0b1222"}
                    strokeWidth={isSel ? 2 : 1}
                  />
                </g>
              );
            })}
            {spamPts.map((p, i) => {
              const isSel = selected?.cls === "spam" && selected.idx === i;
              const cx = sx(p.x);
              const cy = sy(p.y);
              return (
                <g
                  key={`s${i}`}
                  tabIndex={0}
                  role="button"
                  aria-label={`Spam point ${i + 1} at x ${p.x.toFixed(2)}, y ${p.y.toFixed(2)}. Use arrow keys to move it.`}
                  onPointerDown={handlePointerDown("spam", i)}
                  onKeyDown={handleKeyDown("spam", i, p)}
                  onFocus={() => setSelected({ cls: "spam", idx: i })}
                  className="cursor-grab focus:outline-none"
                >
                  <circle cx={cx.toFixed(2)} cy={cy.toFixed(2)} r={12} fill="transparent" />
                  <path
                    d={`M${cx.toFixed(2)} ${(cy - 7).toFixed(2)} L${(cx + 7).toFixed(2)} ${cy.toFixed(2)} L${cx.toFixed(2)} ${(cy + 7).toFixed(2)} L${(cx - 7).toFixed(2)} ${cy.toFixed(2)} Z`}
                    fill="var(--color-warning)"
                    stroke={isSel ? "#f1f5f9" : "#0b1222"}
                    strokeWidth={isSel ? 2 : 1}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Side panel */}
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-[#1e293b] p-3">
            <p className="text-[11px] font-semibold text-white mb-2">Legend</p>
            <div className="flex flex-col gap-1.5 text-[11px] text-[#94a3b8]">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#3bb4a4] inline-block shrink-0" />
                ham point (circle)
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rotate-45 bg-[var(--color-warning)] inline-block shrink-0" />
                spam point (diamond)
              </span>
              <span className="flex items-center gap-2">
                <span className="w-4 h-0.5 bg-[var(--color-accent)] inline-block shrink-0" />
                decision boundary (P = 0.5)
              </span>
              <span className="text-[10px] text-[#475569]">
                Ellipses: 1 and 2 standard deviations of each fitted
                class-conditional Gaussian. Axis aligned by construction.
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-[#1e293b] p-3">
            <p className="text-[11px] font-semibold text-white mb-2">
              Fit from the current points
            </p>
            <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[10px] font-mono">
              <thead>
                <tr className="text-[#475569] text-left">
                  <th className="py-1 pr-2 font-semibold">class</th>
                  <th className="py-1 pr-2 font-semibold">mean</th>
                  <th className="py-1 font-semibold">variance</th>
                </tr>
              </thead>
              <tbody>
                {fitRows.map(({ label, cls, color }) => (
                  <tr key={label} className="border-t border-[#1e293b]">
                    <td className="py-1.5 pr-2 font-bold" style={{ color }}>
                      {label}
                    </td>
                    <td className="py-1.5 pr-2 text-[#f1f5f9]">
                      ({cls.mean[0].toFixed(2)}, {cls.mean[1].toFixed(2)})
                    </td>
                    <td className="py-1.5 text-[#f1f5f9]">
                      ({cls.variance[0].toFixed(2)}, {cls.variance[1].toFixed(2)})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <p className="text-[10px] text-[#475569] mt-2">
              Priors: ham {fit.ham.n}/{fit.ham.n + fit.spam.n} ={" "}
              {fit.ham.prior.toFixed(2)}, spam {fit.spam.n}/{fit.ham.n + fit.spam.n} ={" "}
              {fit.spam.prior.toFixed(2)}. Refit on every move.
            </p>
          </div>

          <div className="rounded-xl border border-[#1e293b] p-3">
            <p className="text-[11px] font-semibold text-white mb-1.5">Selected point</p>
            {selectedPt && selected && selectedPosterior !== null ? (
              <p className="text-[11px] text-[#94a3b8] font-mono leading-relaxed">
                {selected.cls} #{selected.idx + 1} at ({selectedPt.x.toFixed(2)},{" "}
                {selectedPt.y.toFixed(2)})
                <br />
                P(spam | x) = {selectedPosterior.toFixed(3)}
              </p>
            ) : (
              <p className="text-[11px] text-[#475569]">
                Click or Tab to a point to see its posterior under the current
                fit.
              </p>
            )}
          </div>

          <p className="text-[10px] text-[#475569] leading-relaxed">
            Drag any point with the mouse, or Tab to it and use the arrow keys
            (step {KEY_STEP}). Means, variances, ellipses, and the gold
            boundary refit immediately from the points you see.
          </p>
        </div>
      </div>
    </div>
  );
}
