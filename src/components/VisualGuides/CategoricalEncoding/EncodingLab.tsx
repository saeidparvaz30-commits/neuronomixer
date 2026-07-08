"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  EncodingMethod,
  METHOD_ORDER,
  METHOD_META,
  HOUSES,
  encodeHouses,
  categoryCounts,
} from "./types";

interface Props {
  method: EncodingMethod;
  explored: ReadonlySet<EncodingMethod>;
  onMethodChange: (m: EncodingMethod) => void;
}

function EncodingLabInner({ method, explored, onMethodChange }: Props) {
  const encoded = useMemo(() => encodeHouses(method), [method]);
  const meta = METHOD_META[method];

  // Frequency collisions, computed from the data: categories sharing a count.
  const collisions = useMemo(() => {
    const byCount = new Map<number, string[]>();
    for (const [cat, count] of categoryCounts()) {
      byCount.set(count, [...(byCount.get(count) ?? []), cat]);
    }
    return [...byCount.entries()]
      .filter(([, cats]) => cats.length > 1)
      .map(([count, cats]) => ({ count, cats: cats.sort() }));
  }, []);

  return (
    <div>
      {/* Method toggle */}
      <div
        role="radiogroup"
        aria-label="Encoding method"
        className="flex flex-wrap gap-2 mb-4"
      >
        {METHOD_ORDER.map((m) => {
          const active = m === method;
          const visited = explored.has(m);
          return (
            <button
              key={m}
              role="radio"
              aria-checked={active}
              onClick={() => onMethodChange(m)}
              className={`px-4 py-2 rounded-xl text-[12px] font-semibold border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] ${
                active
                  ? "text-white"
                  : "border-[#1e293b] text-[#94a3b8] hover:text-white hover:border-[#334155]"
              }`}
              style={
                active
                  ? {
                      borderColor: METHOD_META[m].color,
                      background: `color-mix(in srgb, ${METHOD_META[m].color} 12%, transparent)`,
                    }
                  : undefined
              }
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ background: METHOD_META[m].color }}
                  aria-hidden="true"
                />
                {METHOD_META[m].label}
                {visited && (
                  <>
                    <span aria-hidden="true">✓</span>
                    <span className="sr-only">(visited)</span>
                  </>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Assumption banner for the active method */}
      <AnimatePresence mode="wait">
        <motion.div
          key={method}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mb-4 px-4 py-2.5 rounded-xl border text-[12px] font-medium"
          style={{
            borderColor: `color-mix(in srgb, ${meta.color} 27%, transparent)`,
            background: `color-mix(in srgb, ${meta.color} 5%, transparent)`,
            color: meta.color,
          }}
        >
          <strong>{meta.label}</strong>: {meta.tagline}
        </motion.div>
      </AnimatePresence>

      {/* Live encoded matrix */}
      <div className="overflow-x-auto rounded-xl border border-[#1e293b]">
        <table className="w-full text-[12px]" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr className="bg-[#1e293b] text-left">
              <th className="px-3 py-2 font-semibold text-[#94a3b8]">Neighborhood</th>
              <th className="px-3 py-2 font-semibold text-[#94a3b8] text-right">
                Price ($k)
              </th>
              {encoded.columns.map((c) => (
                <th
                  key={c}
                  className="px-3 py-2 font-mono font-semibold text-right"
                  style={{ color: meta.color }}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOUSES.map((h, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}>
                <td className="px-3 py-1.5 text-[#f1f5f9]">{h.neighborhood}</td>
                <td className="px-3 py-1.5 text-right font-mono text-[#94a3b8]">{h.price}</td>
                {encoded.rows[i].map((v, j) => (
                  <td key={j} className="px-3 py-1.5 text-right font-mono text-[#f1f5f9]">
                    {v.toFixed(encoded.decimals)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Method-specific computed observation */}
      <div className="mt-3 text-[12px] text-[#94a3b8] leading-relaxed">
        {method === "onehot" && (
          <p>
            Four categories became four columns, and every row is a single 1 among 0s. No
            category is claimed to be bigger, closer, or better than another. That
            neutrality is exactly what the width buys you.
          </p>
        )}
        {method === "ordinal" && (
          <p>
            One compact column, but read the codes: they follow the alphabet, not the
            market. The encoding now asserts that Old Town (2) sits exactly twice as far
            from Docklands (0) as Hillcrest (1) does. Nothing in the data says that. The
            fit lab below measures the damage.
          </p>
        )}
        {method === "frequency" && collisions.length > 0 && (
          <p>
            One column of prevalence, and a lossy one: {collisions[0].cats.join(" and ")}{" "}
            each appear {collisions[0].count} times, so both encode to{" "}
            {(collisions[0].count / HOUSES.length).toFixed(3)}. The model literally cannot
            tell them apart anymore, even though their mean prices differ.
          </p>
        )}
        {method === "target" && (
          <p>
            Each neighborhood became its own mean price, computed from the very column the
            model is supposed to predict. On four well-populated categories that is
            powerful and often fine. On tiny categories it quietly memorizes the answer,
            which the last section demonstrates.
          </p>
        )}
      </div>
    </div>
  );
}

const EncodingLab = React.memo(EncodingLabInner);
export default EncodingLab;
