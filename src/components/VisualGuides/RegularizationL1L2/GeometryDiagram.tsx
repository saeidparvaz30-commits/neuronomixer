"use client";

import React from "react";

// Schematic diagram of the standard geometric picture: loss contours meeting
// the L1 diamond constraint (corner touch, exact zero) vs the L2 circular
// constraint (off-axis touch, smooth shrinkage). Labeled illustrative; shapes
// are hand-placed, not computed from the guide's dataset.

const W = 300;
const H = 250;
const OX = 120; // origin x
const OY = 150; // origin y
const T = 52; // constraint "radius"
const CX = 210; // contour center x (schematic OLS solution)
const CY = 70; // contour center y

function Axes() {
  return (
    <g>
      <line x1={14} x2={W - 12} y1={OY} y2={OY} stroke="#334155" strokeWidth={1} />
      <line x1={OX} x2={OX} y1={20} y2={H - 16} stroke="#334155" strokeWidth={1} />
      <text x={W - 14} y={OY - 6} textAnchor="end" fontSize={11} fill="#475569">
        w1
      </text>
      <text x={OX + 7} y={28} fontSize={11} fill="#475569">
        w2
      </text>
    </g>
  );
}

function Contours({ radii }: { radii: [number, number][] }) {
  return (
    <g>
      {radii.map(([rx, ry], i) => (
        <ellipse
          key={i}
          cx={CX}
          cy={CY}
          rx={rx}
          ry={ry}
          fill="none"
          stroke="#94a3b8"
          strokeWidth={1}
          opacity={0.35 + i * 0.12}
        />
      ))}
      <circle cx={CX} cy={CY} r={3} fill="#94a3b8" />
      <text x={CX} y={CY - 10} textAnchor="middle" fontSize={9} fill="#94a3b8">
        OLS minimum
      </text>
    </g>
  );
}

function GeometryDiagramInner() {
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* L1 panel */}
        <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-3">
          <p className="text-[12px] font-semibold text-[#a855f7] mb-2">
            L1 (Lasso): diamond constraint
          </p>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto"
            role="img"
            aria-label="Schematic: elliptical loss contours around the unregularized minimum expand until they first touch the L1 diamond constraint at one of its corners, which lies on an axis. Touching at a corner sets one weight exactly to zero."
          >
            <Axes />
            <polygon
              points={`${OX},${OY - T} ${OX + T},${OY} ${OX},${OY + T} ${OX - T},${OY}`}
              fill="#a855f7"
              opacity={0.14}
              stroke="#a855f7"
              strokeWidth={1.5}
            />
            <Contours radii={[[30, 18], [65, 38], [105, 60]]} />
            {/* Touch point at the top corner (on the w2 axis, so w1 = 0) */}
            <circle cx={OX} cy={OY - T} r={5} style={{ fill: "var(--color-success)" }} stroke="#0f172a" strokeWidth={1.5} />
            <text x={OX - 6} y={OY - T - 10} textAnchor="end" fontSize={10} fontWeight={700} style={{ fill: "var(--color-success)" }}>
              corner touch: w1 = 0
            </text>
            <text x={OX - T + 4} y={OY + T - 2} fontSize={9} fill="#a855f7">
              |w1| + |w2| ≤ t
            </text>
          </svg>
        </div>

        {/* L2 panel */}
        <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-3">
          <p className="text-[12px] font-semibold text-[#3bb4a4] mb-2">
            L2 (Ridge): circular constraint
          </p>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto"
            role="img"
            aria-label="Schematic: the same elliptical loss contours expand until they first touch the L2 circular constraint. The touch point is generically off the axes, so both weights shrink but neither becomes exactly zero."
          >
            <Axes />
            <circle
              cx={OX}
              cy={OY}
              r={T}
              fill="#3bb4a4"
              opacity={0.14}
              stroke="#3bb4a4"
              strokeWidth={1.5}
            />
            <Contours radii={[[25, 18], [50, 35], [80, 56]]} />
            {/* Touch point off-axis, toward the contour center */}
            <circle cx={158.8} cy={115.5} r={5} style={{ fill: "var(--color-success)" }} stroke="#0f172a" strokeWidth={1.5} />
            <text x={166} y={112} fontSize={10} fontWeight={700} style={{ fill: "var(--color-success)" }}>
              off-axis touch:
            </text>
            <text x={166} y={124} fontSize={10} fontWeight={700} style={{ fill: "var(--color-success)" }}>
              both shrink, none = 0
            </text>
            <text x={OX - T + 2} y={OY + T + 12} fontSize={9} fill="#3bb4a4">
              w1² + w2² ≤ t²
            </text>
          </svg>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-[#475569] leading-relaxed">
        Schematic illustration: this is the standard geometric picture of penalized
        regression as constrained optimization, drawn for two weights. Shapes and
        positions are illustrative, not computed from the dataset above. The ellipses
        are contours of the squared error loss; the first contour to touch the
        constraint region gives the regularized solution. A diamond gets touched at
        its corners (which sit on the axes) far more often than on its flat sides,
        which is why L1 zeros out weights while L2 only shrinks them.
      </p>
    </div>
  );
}

const GeometryDiagram = React.memo(GeometryDiagramInner);
export default GeometryDiagram;
