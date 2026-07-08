"use client";

import React, { useMemo } from "react";
import { histogram } from "./data";

interface Series {
  name: string;
  values: number[];
  color: string;
}

interface Props {
  values: number[];
  binCount: number;
  logScale?: boolean;
  /** When provided, draw an overlaid histogram per series instead of one. */
  series?: Series[] | null;
  /** Exact value whose bin should be highlighted as suspicious (sentinel). */
  sentinel?: number;
  meanValue?: number | null;
  medianValue?: number | null;
  fmt: (v: number) => string;
  ariaLabel: string;
}

const W = 640;
const H = 300;
const PAD = { l: 44, r: 14, t: 30, b: 34 };
const IW = W - PAD.l - PAD.r;
const IH = H - PAD.t - PAD.b;

const BAR_COLOR = "#1e5d8a";

export default function Histogram({
  values,
  binCount,
  logScale = false,
  series = null,
  sentinel,
  meanValue = null,
  medianValue = null,
  fmt,
  ariaLabel,
}: Props) {
  const transform = logScale ? (v: number) => Math.log10(v) : undefined;
  const inverse = logScale ? (v: number) => Math.pow(10, v) : (v: number) => v;

  const main = useMemo(
    () => histogram(values, binCount, transform),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [values, binCount, logScale]
  );

  const seriesBins = useMemo(() => {
    if (!series) return null;
    // Shared edges: bin each series over the SAME domain as the combined data.
    const domainWidth = (main.max - main.min) / binCount;
    return series.map((s) => {
      const counts = new Array<number>(binCount).fill(0);
      for (const raw of s.values) {
        const v = transform ? transform(raw) : raw;
        let idx = Math.floor((v - main.min) / domainWidth);
        if (idx >= binCount) idx = binCount - 1;
        if (idx < 0) idx = 0;
        counts[idx] += 1;
      }
      return { ...s, counts };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, binCount, main.min, main.max, logScale]);

  const maxCount = useMemo(() => {
    if (seriesBins) {
      let m = 1;
      for (const s of seriesBins) for (const c of s.counts) m = Math.max(m, c);
      return m;
    }
    return Math.max(1, ...main.bins.map((b) => b.count));
  }, [main.bins, seriesBins]);

  const toX = (v: number) => PAD.l + ((v - main.min) / (main.max - main.min)) * IW;
  const toY = (c: number) => PAD.t + IH - (c / maxCount) * IH;

  // ~5 x ticks in the (possibly transformed) domain, labeled in original units
  const xTicks = useMemo(() => {
    const n = 5;
    return Array.from({ length: n }, (_, i) => {
      const t = main.min + ((main.max - main.min) * i) / (n - 1);
      return { pos: t, label: fmt(inverse(t)) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [main.min, main.max, logScale, fmt]);

  const yTicks = useMemo(() => {
    const step = Math.max(1, Math.ceil(maxCount / 4));
    const ticks: number[] = [];
    for (let c = 0; c <= maxCount; c += step) ticks.push(c);
    return ticks;
  }, [maxCount]);

  const meanPos =
    meanValue !== null && (!logScale || meanValue > 0)
      ? logScale
        ? Math.log10(meanValue)
        : meanValue
      : null;
  const medianPos =
    medianValue !== null && (!logScale || medianValue > 0)
      ? logScale
        ? Math.log10(medianValue)
        : medianValue
      : null;

  const binWidthPx = IW / binCount;

  return (
    <div role="img" aria-label={ariaLabel}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block">
        {/* y grid + ticks */}
        {yTicks.map((c) => (
          <g key={`y-${c}`}>
            <line
              x1={PAD.l}
              y1={toY(c)}
              x2={PAD.l + IW}
              y2={toY(c)}
              stroke="#1e293b"
              strokeWidth="1"
            />
            <text
              x={PAD.l - 6}
              y={toY(c) + 3}
              textAnchor="end"
              fontSize="10"
              fill="#475569"
            >
              {c}
            </text>
          </g>
        ))}

        {/* bars */}
        {!seriesBins &&
          main.bins.map((b, i) => {
            const isSentinelBin =
              sentinel !== undefined && sentinel >= b.x0 && sentinel < b.x1 + 1e-9 && b.count > 0;
            const h = ((b.count / maxCount) * IH);
            return (
              <rect
                key={i}
                x={PAD.l + i * binWidthPx + 0.5}
                y={toY(b.count)}
                width={Math.max(0, binWidthPx - 1)}
                height={h}
                fill={isSentinelBin ? "var(--color-warning)" : BAR_COLOR}
              >
                <title>{`${fmt(inverse(b.x0))} to ${fmt(inverse(b.x1))}: ${b.count} rows`}</title>
              </rect>
            );
          })}

        {seriesBins &&
          seriesBins.map((s, si) => (
            <g key={s.name}>
              {s.counts.map((c, i) =>
                c > 0 ? (
                  <rect
                    key={i}
                    x={PAD.l + i * binWidthPx + 0.5}
                    y={toY(c)}
                    width={Math.max(0, binWidthPx - 1)}
                    height={(c / maxCount) * IH}
                    fill={s.color}
                    fillOpacity={0.6}
                    stroke={s.color}
                    strokeWidth={si === 0 ? 1 : 1.5}
                    strokeDasharray={si === 0 ? undefined : "3 2"}
                  >
                    <title>{`${s.name}, ${fmt(inverse(main.min + i * ((main.max - main.min) / binCount)))} bin: ${c} rows`}</title>
                  </rect>
                ) : null
              )}
            </g>
          ))}

        {/* mean / median markers */}
        {meanPos !== null && meanPos >= main.min && meanPos <= main.max && (
          <g>
            <line
              x1={toX(meanPos)}
              y1={PAD.t - 4}
              x2={toX(meanPos)}
              y2={PAD.t + IH}
              stroke="var(--color-warning)"
              strokeWidth="2"
              strokeDasharray="5 3"
            />
            <text
              x={toX(meanPos) + 4}
              y={PAD.t + 4}
              fontSize="10"
              fontWeight="600"
              fill="var(--color-warning)"
            >
              mean
            </text>
          </g>
        )}
        {medianPos !== null && medianPos >= main.min && medianPos <= main.max && (
          <g>
            <line
              x1={toX(medianPos)}
              y1={PAD.t - 4}
              x2={toX(medianPos)}
              y2={PAD.t + IH}
              stroke="var(--color-success)"
              strokeWidth="2"
              strokeDasharray="5 3"
            />
            <text
              x={toX(medianPos) + 4}
              y={PAD.t + 16}
              fontSize="10"
              fontWeight="600"
              fill="var(--color-success)"
            >
              median
            </text>
          </g>
        )}

        {/* x axis */}
        <line
          x1={PAD.l}
          y1={PAD.t + IH}
          x2={PAD.l + IW}
          y2={PAD.t + IH}
          stroke="#334155"
          strokeWidth="1"
        />
        {xTicks.map((t, i) => (
          <text
            key={i}
            x={toX(t.pos)}
            y={PAD.t + IH + 16}
            textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
            fontSize="10"
            fill="#475569"
          >
            {t.label}
          </text>
        ))}
      </svg>

      {seriesBins && (
        <div className="flex flex-wrap items-center gap-4 mt-2">
          {seriesBins.map((s, si) => (
            <span key={s.name} className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
              <span
                aria-hidden="true"
                className="inline-block w-3 h-3 rounded-sm"
                style={{
                  background: s.color,
                  opacity: 0.8,
                  border: si === 1 ? `1.5px dashed ${s.color}` : undefined,
                }}
              />
              {s.name} (n = {s.values.length})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
