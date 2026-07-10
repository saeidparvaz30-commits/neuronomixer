"use client";

import React from "react";
import { BeamLevel, SEED, displayChar, displayText } from "./decodingMath";

interface Props {
  levels: BeamLevel[];
  width: number;
}

const NODE_W = 92;
const NODE_H = 32;
const COL_GAP = 128;
const ROW_GAP = 40;
const PAD_X = 12;
const PAD_Y = 14;

/**
 * The beam-search tree as pure SVG. Every node is a real candidate with its
 * computed cumulative log-prob; gold nodes survived the beam cut, dim nodes
 * were pruned. A full text version follows the drawing for keyboard and
 * screen-reader users.
 */
export default function BeamTree({ levels, width }: Props) {
  const maxRows = Math.max(
    1,
    ...levels.map((l) => l.nodes.length)
  );
  const totalW = PAD_X * 2 + levels.length * COL_GAP + NODE_W;
  const svgH = PAD_Y * 2 + maxRows * ROW_GAP;

  // Position map: id -> center of the node's right edge / left edge
  const pos = new Map<string, { x: number; y: number }>();
  const rootY = PAD_Y + ((maxRows - 1) * ROW_GAP) / 2 + NODE_H / 2;
  pos.set("root", { x: PAD_X, y: rootY });
  levels.forEach((level, l) => {
    const x = PAD_X + (l + 1) * COL_GAP;
    level.nodes.forEach((n, i) => {
      pos.set(n.id, { x, y: PAD_Y + i * ROW_GAP + NODE_H / 2 });
    });
  });

  const deepest = levels[levels.length - 1];
  const keptFinal = deepest ? deepest.nodes.filter((n) => n.kept) : [];

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-[#1e293b] bg-[#0f172a]">
        <svg
          width={Math.max(totalW, 320)}
          height={svgH}
          viewBox={`0 0 ${Math.max(totalW, 320)} ${svgH}`}
          role="img"
          aria-label={`Beam search tree with width ${width}: ${levels.length} levels of candidates, gold nodes kept, gray nodes pruned. A text version follows below.`}
        >
          {/* connectors */}
          {levels.map((level, l) =>
            level.nodes.map((n) => {
              const p = pos.get(n.parentId);
              const c = pos.get(n.id);
              if (!p || !c) return null;
              return (
                <line
                  key={`ln-${n.id}`}
                  x1={(p.x + NODE_W).toFixed(1)}
                  y1={p.y.toFixed(1)}
                  x2={c.x.toFixed(1)}
                  y2={c.y.toFixed(1)}
                  stroke={n.kept ? "#d4af3766" : "#1e293b"}
                  strokeWidth={n.kept ? 1.5 : 1}
                />
              );
            })
          )}
          {/* root node */}
          <g>
            <rect
              x={PAD_X}
              y={(rootY - NODE_H / 2).toFixed(1)}
              width={NODE_W}
              height={NODE_H}
              rx={6}
              fill="#162032"
              stroke="#334155"
            />
            <text
              x={PAD_X + NODE_W / 2}
              y={rootY + 4}
              textAnchor="middle"
              fontSize={11}
              fontFamily="monospace"
              fill="#94a3b8"
            >
              &quot;{displayText(SEED)}&quot;
            </text>
          </g>
          {/* candidate nodes */}
          {levels.map((level) =>
            level.nodes.map((n) => {
              const c = pos.get(n.id);
              if (!c) return null;
              const y = c.y - NODE_H / 2;
              return (
                <g key={n.id} opacity={n.kept ? 1 : 0.55}>
                  <rect
                    x={c.x}
                    y={y.toFixed(1)}
                    width={NODE_W}
                    height={NODE_H}
                    rx={6}
                    fill={n.kept ? "#162032" : "#0f172a"}
                    stroke={n.kept ? "var(--color-accent)" : "#334155"}
                    strokeWidth={n.kept ? 1.5 : 1}
                  />
                  <text
                    x={c.x + 14}
                    y={c.y + 4}
                    textAnchor="middle"
                    fontSize={12}
                    fontFamily="monospace"
                    fontWeight={700}
                    fill={n.kept ? "#d4af37" : "#475569"}
                  >
                    {displayChar(n.char)}
                  </text>
                  <text
                    x={c.x + 30}
                    y={c.y + 4}
                    fontSize={10}
                    fontFamily="monospace"
                    fill={n.kept ? "#f1f5f9" : "#475569"}
                  >
                    {n.cumLogProb.toFixed(2)}
                  </text>
                  <text
                    x={c.x + NODE_W - 6}
                    y={c.y - 4}
                    textAnchor="end"
                    fontSize={8}
                    fill={n.kept ? "#d4af37" : "#475569"}
                  >
                    {n.kept ? `#${(n.rank ?? 0) + 1}` : "cut"}
                  </text>
                </g>
              );
            })
          )}
        </svg>
      </div>

      {/* Surviving beams at the deepest expanded level */}
      {keptFinal.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#1e293b] text-left text-[#94a3b8]">
                <th className="px-3 py-2 font-semibold">Beam</th>
                <th className="px-3 py-2 font-semibold">
                  Text after {levels.length} steps
                </th>
                <th className="px-3 py-2 font-semibold text-right">
                  Cumulative log-prob
                </th>
              </tr>
            </thead>
            <tbody>
              {keptFinal.map((n, i) => (
                <tr
                  key={n.id}
                  style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}
                >
                  <td className="px-3 py-2 text-[var(--color-accent)] font-semibold">
                    #{(n.rank ?? 0) + 1}
                  </td>
                  <td className="px-3 py-2 font-mono text-[#f1f5f9]">
                    {displayText(n.text)}
                  </td>
                  <td className="px-3 py-2 font-mono text-right text-[#94a3b8]">
                    {n.cumLogProb.toFixed(3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Full text equivalent of the tree */}
      <details className="mt-3">
        <summary className="text-[12px] text-[#94a3b8] cursor-pointer hover:text-white">
          Text version of the full tree (every candidate, kept and pruned)
        </summary>
        <div className="mt-2 space-y-2">
          {levels.map((level, l) => (
            <div key={l}>
              <p className="text-[11px] font-semibold text-[#94a3b8] mb-1">
                Level {l + 1}
              </p>
              <ul className="space-y-0.5">
                {level.nodes.map((n) => (
                  <li key={n.id} className="text-[11px] font-mono">
                    <span className={n.kept ? "text-[var(--color-accent)]" : "text-[#475569]"}>
                      {n.kept ? `kept #${(n.rank ?? 0) + 1}` : "pruned"}
                    </span>{" "}
                    <span className={n.kept ? "text-[#f1f5f9]" : "text-[#475569]"}>
                      &quot;{displayText(n.text)}&quot; cum log-prob{" "}
                      {n.cumLogProb.toFixed(3)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
