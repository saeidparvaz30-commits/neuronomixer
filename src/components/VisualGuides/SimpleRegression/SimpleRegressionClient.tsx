"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  DataPoint,
  OLSFit,
  computeOLS,
  computePrediction,
  normalQuantile,
  PRESET_STRONG,
  PRESET_MODERATE,
  PRESET_WEAK,
  PRESET_NONLINEAR,
  PRESET_OUTLIER,
} from "./types";

// ── Constants ─────────────────────────────────────────────────────────────────

const SVG_W = 520;
const SVG_H = 420;
const PAD = { l: 56, r: 20, t: 20, b: 54 };
const PLOT_W = SVG_W - PAD.l - PAD.r;
const PLOT_H = SVG_H - PAD.t - PAD.b;

// ── Preset definitions ────────────────────────────────────────────────────────

type PresetKey = "strong" | "moderate" | "weak" | "nonlinear" | "outlier";

const PRESETS: Record<PresetKey, { label: string; points: DataPoint[] }> = {
  strong:    { label: "Strong Linear (r ≈ 0.95)",    points: PRESET_STRONG },
  moderate:  { label: "Moderate Linear (r ≈ 0.65)",  points: PRESET_MODERATE },
  weak:      { label: "Weak Linear (r ≈ 0.25)",      points: PRESET_WEAK },
  nonlinear: { label: "Nonlinear (Quadratic)",        points: PRESET_NONLINEAR },
  outlier:   { label: "Outliers Present",             points: PRESET_OUTLIER },
};

// ── Scale helpers ─────────────────────────────────────────────────────────────

interface AxisBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

function computeBounds(points: DataPoint[]): AxisBounds {
  if (points.length === 0) {
    return { xMin: 0, xMax: 10, yMin: 0, yMax: 20 };
  }
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  let xMin = Math.min(...xs);
  let xMax = Math.max(...xs);
  let yMin = Math.min(...ys);
  let yMax = Math.max(...ys);

  // Ensure minimum range of 10
  if (xMax - xMin < 10) {
    const cx = (xMin + xMax) / 2;
    xMin = cx - 5;
    xMax = cx + 5;
  }
  if (yMax - yMin < 10) {
    const cy = (yMin + yMax) / 2;
    yMin = cy - 5;
    yMax = cy + 5;
  }

  // 15% padding
  const xPad = (xMax - xMin) * 0.15;
  const yPad = (yMax - yMin) * 0.15;

  return {
    xMin: xMin - xPad,
    xMax: xMax + xPad,
    yMin: yMin - yPad,
    yMax: yMax + yPad,
  };
}

function dataToScreen(
  dx: number,
  dy: number,
  bounds: AxisBounds
): { sx: number; sy: number } {
  const sx = PAD.l + ((dx - bounds.xMin) / (bounds.xMax - bounds.xMin)) * PLOT_W;
  const sy = PAD.t + (1 - (dy - bounds.yMin) / (bounds.yMax - bounds.yMin)) * PLOT_H;
  return { sx, sy };
}

function screenToData(
  sx: number,
  sy: number,
  bounds: AxisBounds
): { dx: number; dy: number } {
  const dx = ((sx - PAD.l) / PLOT_W) * (bounds.xMax - bounds.xMin) + bounds.xMin;
  const dy = ((PLOT_H - (sy - PAD.t)) / PLOT_H) * (bounds.yMax - bounds.yMin) + bounds.yMin;
  return { dx, dy };
}

function clampToData(dx: number, dy: number, bounds: AxisBounds): { dx: number; dy: number } {
  return {
    dx: Math.max(bounds.xMin, Math.min(bounds.xMax, dx)),
    dy: Math.max(bounds.yMin, Math.min(bounds.yMax, dy)),
  };
}

// ── Axis tick generator ───────────────────────────────────────────────────────

function niceTickStep(range: number, targetCount: number): number {
  const rough = range / targetCount;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const frac = rough / pow;
  let nice: number;
  if (frac < 1.5) nice = 1;
  else if (frac < 3) nice = 2;
  else if (frac < 7) nice = 5;
  else nice = 10;
  return nice * pow;
}

function generateTicks(min: number, max: number, count: number): number[] {
  const step = niceTickStep(max - min, count);
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let t = start; t <= max + 1e-9; t += step) {
    ticks.push(parseFloat(t.toFixed(10)));
  }
  return ticks;
}

// ── R² interpretation ─────────────────────────────────────────────────────────

function r2Badge(r2: number): { label: string; color: string } {
  if (r2 >= 0.7) return { label: "Strong", color: "#3bb4a4" };
  if (r2 >= 0.4) return { label: "Moderate", color: "#d4af37" };
  return { label: "Weak", color: "#ef4444" };
}

// ── Scatter Plot component ────────────────────────────────────────────────────

interface ScatterPlotProps {
  points: DataPoint[];
  fit: OLSFit | null;
  bounds: AxisBounds;
  showResiduals: boolean;
  showMean: boolean;
  predX: number | null;
  predFit: ReturnType<typeof computePrediction> | null;
  onAddPoint: (dx: number, dy: number) => void;
  onDragStart: (id: string) => void;
  onDragMove: (dx: number, dy: number) => void;
  onDragEnd: () => void;
  onRemovePoint: (id: string) => void;
}

function ScatterPlot({
  points,
  fit,
  bounds,
  showResiduals,
  showMean,
  predX,
  predFit,
  onAddPoint,
  onDragStart,
  onDragMove,
  onDragEnd,
  onRemovePoint,
}: ScatterPlotProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  function getSvgCoords(e: React.MouseEvent | MouseEvent): { sx: number; sy: number } {
    const svg = svgRef.current;
    if (!svg) return { sx: 0, sy: 0 };
    const rect = svg.getBoundingClientRect();
    const scaleX = SVG_W / rect.width;
    const scaleY = SVG_H / rect.height;
    return {
      sx: (e.clientX - rect.left) * scaleX,
      sy: (e.clientY - rect.top) * scaleY,
    };
  }

  function isInPlotArea(sx: number, sy: number): boolean {
    return (
      sx >= PAD.l && sx <= PAD.l + PLOT_W &&
      sy >= PAD.t && sy <= PAD.t + PLOT_H
    );
  }

  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    const target = e.target as SVGElement;
    if (target.tagName === "circle") return;
    const { sx, sy } = getSvgCoords(e);
    if (!isInPlotArea(sx, sy)) return;
    const { dx, dy } = screenToData(sx, sy, bounds);
    onAddPoint(dx, dy);
  }

  function handleCircleMouseDown(e: React.MouseEvent<SVGCircleElement>, id: string) {
    e.preventDefault();
    e.stopPropagation();
    onDragStart(id);
    const moveHandler = (ev: MouseEvent) => {
      const { sx, sy } = getSvgCoords(ev);
      const { dx, dy } = screenToData(sx, sy, bounds);
      onDragMove(dx, dy);
    };
    const upHandler = () => {
      onDragEnd();
      window.removeEventListener("mousemove", moveHandler);
      window.removeEventListener("mouseup", upHandler);
    };
    window.addEventListener("mousemove", moveHandler);
    window.addEventListener("mouseup", upHandler);
  }

  function handleCircleContextMenu(e: React.MouseEvent<SVGCircleElement>, id: string) {
    e.preventDefault();
    onRemovePoint(id);
  }

  const xTicks = generateTicks(bounds.xMin, bounds.xMax, 6);
  const yTicks = generateTicks(bounds.yMin, bounds.yMax, 6);

  // Regression line endpoints (clipped to x-axis range)
  const lineXs = fit
    ? [bounds.xMin, bounds.xMax].map((x) => {
        const y = fit.slope * x + fit.intercept;
        const { sx, sy } = dataToScreen(x, y, bounds);
        return { sx, sy };
      })
    : null;

  // Mean crosshair
  const meanScreen = fit ? dataToScreen(fit.meanX, fit.meanY, bounds) : null;

  // Prediction vertical line
  const predScreen =
    predX !== null && predFit !== null
      ? {
          x: dataToScreen(predX, 0, bounds).sx,
          yHat: dataToScreen(predX, predFit.yHat, bounds).sy,
          ciLower: dataToScreen(predX, predFit.ciLower, bounds).sy,
          ciUpper: dataToScreen(predX, predFit.ciUpper, bounds).sy,
          piLower: dataToScreen(predX, predFit.piLower, bounds).sy,
          piUpper: dataToScreen(predX, predFit.piUpper, bounds).sy,
        }
      : null;

  // Equation text
  const eqText = fit
    ? `ŷ = ${fit.intercept.toFixed(2)} + ${fit.slope.toFixed(2)}x`
    : null;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      width="100%"
      style={{ cursor: "crosshair" }}
      onClick={handleSvgClick}
    >
      {/* Plot background */}
      <rect
        x={PAD.l}
        y={PAD.t}
        width={PLOT_W}
        height={PLOT_H}
        fill="#0f172a"
        stroke="#1e293b"
        strokeWidth={1}
      />

      {/* Grid lines + ticks */}
      {xTicks.map((t) => {
        const { sx } = dataToScreen(t, 0, bounds);
        if (sx < PAD.l - 1 || sx > PAD.l + PLOT_W + 1) return null;
        return (
          <g key={`xt-${t}`}>
            <line
              x1={sx} y1={PAD.t}
              x2={sx} y2={PAD.t + PLOT_H}
              stroke="#1e293b" strokeWidth={1}
            />
            <text
              x={sx} y={PAD.t + PLOT_H + 18}
              textAnchor="middle" fill="#475569" fontSize={10}
            >
              {Number.isInteger(t) ? t : t.toFixed(1)}
            </text>
          </g>
        );
      })}
      {yTicks.map((t) => {
        const { sy } = dataToScreen(0, t, bounds);
        if (sy < PAD.t - 1 || sy > PAD.t + PLOT_H + 1) return null;
        return (
          <g key={`yt-${t}`}>
            <line
              x1={PAD.l} y1={sy}
              x2={PAD.l + PLOT_W} y2={sy}
              stroke="#1e293b" strokeWidth={1}
            />
            <text
              x={PAD.l - 8} y={sy + 3.5}
              textAnchor="end" fill="#475569" fontSize={10}
            >
              {Number.isInteger(t) ? t : t.toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* Axis borders */}
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + PLOT_H} stroke="#334155" strokeWidth={1.5} />
      <line x1={PAD.l} y1={PAD.t + PLOT_H} x2={PAD.l + PLOT_W} y2={PAD.t + PLOT_H} stroke="#334155" strokeWidth={1.5} />

      {/* Axis labels */}
      <text
        x={PAD.l + PLOT_W / 2} y={SVG_H - 8}
        textAnchor="middle" fill="#94a3b8" fontSize={11}
      >
        Predictor (x)
      </text>
      <text
        x={14} y={PAD.t + PLOT_H / 2}
        textAnchor="middle" fill="#94a3b8" fontSize={11}
        transform={`rotate(-90, 14, ${PAD.t + PLOT_H / 2})`}
      >
        Response (y)
      </text>

      {/* Mean crosshair */}
      {showMean && meanScreen && (
        <>
          <line
            x1={PAD.l} y1={meanScreen.sy}
            x2={PAD.l + PLOT_W} y2={meanScreen.sy}
            stroke="#94a3b8" strokeWidth={1}
            strokeDasharray="4,4" opacity={0.5}
          />
          <line
            x1={meanScreen.sx} y1={PAD.t}
            x2={meanScreen.sx} y2={PAD.t + PLOT_H}
            stroke="#94a3b8" strokeWidth={1}
            strokeDasharray="4,4" opacity={0.5}
          />
        </>
      )}

      {/* Residual lines */}
      {showResiduals && fit &&
        points.map((p, i) => {
          const { sx: px, sy: py } = dataToScreen(p.x, p.y, bounds);
          const yhat = fit.fittedValues[i];
          const { sy: fy } = dataToScreen(p.x, yhat, bounds);
          return (
            <line
              key={`res-${p.id}`}
              x1={px} y1={py} x2={px} y2={fy}
              stroke="#94a3b8" strokeWidth={1.5}
              strokeDasharray="3,2" opacity={0.6}
            />
          );
        })}

      {/* Prediction interval display */}
      {predScreen && (
        <>
          {/* PI range */}
          <line
            x1={predScreen.x} y1={predScreen.piLower}
            x2={predScreen.x} y2={predScreen.piUpper}
            stroke="#d4af37" strokeWidth={1.5}
            strokeDasharray="4,3" opacity={0.5}
          />
          {/* CI range */}
          <line
            x1={predScreen.x} y1={predScreen.ciLower}
            x2={predScreen.x} y2={predScreen.ciUpper}
            stroke="#3bb4a4" strokeWidth={2.5}
            opacity={0.8}
          />
          {/* Vertical dashed line */}
          <line
            x1={predScreen.x} y1={PAD.t}
            x2={predScreen.x} y2={PAD.t + PLOT_H}
            stroke="#f1f5f9" strokeWidth={1}
            strokeDasharray="5,3" opacity={0.3}
          />
          {/* Predicted point on regression line */}
          <circle
            cx={predScreen.x} cy={predScreen.yHat}
            r={6} fill="#d4af37" stroke="#0f172a" strokeWidth={2}
          />
        </>
      )}

      {/* Regression line */}
      {lineXs && fit && (
        <motion.line
          x1={lineXs[0].sx} y1={lineXs[0].sy}
          x2={lineXs[1].sx} y2={lineXs[1].sy}
          stroke="#d4af37" strokeWidth={2.5}
          animate={{ x1: lineXs[0].sx, y1: lineXs[0].sy, x2: lineXs[1].sx, y2: lineXs[1].sy }}
          transition={{ duration: 0.25 }}
          clipPath={`url(#plotClip)`}
        />
      )}

      {/* Clip path for regression line */}
      <defs>
        <clipPath id="plotClip">
          <rect x={PAD.l} y={PAD.t} width={PLOT_W} height={PLOT_H} />
        </clipPath>
      </defs>

      {/* Data points */}
      {points.map((p, i) => {
        const { sx, sy } = dataToScreen(p.x, p.y, bounds);
        const residual = fit ? fit.residuals[i] : 0;
        const color = !fit ? "#3bb4a4" : residual >= 0 ? "#3bb4a4" : "#ef4444";
        return (
          <motion.circle
            key={p.id}
            cx={sx} cy={sy}
            r={8}
            fill={color}
            stroke="#0f172a" strokeWidth={2}
            animate={{ cx: sx, cy: sy, fill: color }}
            transition={{ duration: 0.15 }}
            onMouseDown={(e) => handleCircleMouseDown(e as React.MouseEvent<SVGCircleElement>, p.id)}
            onContextMenu={(e) => handleCircleContextMenu(e as React.MouseEvent<SVGCircleElement>, p.id)}
            style={{ cursor: "grab" }}
          />
        );
      })}

      {/* Empty state hint */}
      {points.length === 0 && (
        <text
          x={PAD.l + PLOT_W / 2} y={PAD.t + PLOT_H / 2}
          textAnchor="middle" fill="#334155" fontSize={13}
        >
          Click to add points
        </text>
      )}

      {/* Equation in top-right */}
      {eqText && (
        <text
          x={PAD.l + PLOT_W - 6} y={PAD.t + 16}
          textAnchor="end" fill="#d4af37" fontSize={11}
          fontFamily="monospace"
        >
          {eqText}
        </text>
      )}
    </svg>
  );
}

// ── Residual diagnostic plot ───────────────────────────────────────────────────

function ResidualPlot({ fit }: { fit: OLSFit }) {
  const W = 360, H = 240;
  const P = { l: 44, r: 12, t: 12, b: 36 };
  const IW = W - P.l - P.r;
  const IH = H - P.t - P.b;

  const { fittedValues, residuals } = fit;
  const rMin = Math.min(...residuals);
  const rMax = Math.max(...residuals);
  const rRange = Math.max(Math.abs(rMin), Math.abs(rMax)) * 1.3 || 1;

  const fMin = Math.min(...fittedValues);
  const fMax = Math.max(...fittedValues);
  const fRange = fMax - fMin || 1;

  function tx(v: number): number {
    return P.l + ((v - fMin) / fRange) * IW;
  }
  function ty(r: number): number {
    return P.t + (1 - (r + rRange) / (2 * rRange)) * IH;
  }

  const zero_y = ty(0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      <rect x={P.l} y={P.t} width={IW} height={IH} fill="#0f172a" stroke="#1e293b" />
      {/* y=0 dashed */}
      <line x1={P.l} y1={zero_y} x2={P.l + IW} y2={zero_y}
        stroke="#475569" strokeWidth={1} strokeDasharray="4,3" />
      {/* Points */}
      {fittedValues.map((fv, i) => {
        const r = residuals[i];
        const cx = tx(fv);
        const cy = ty(r);
        return (
          <circle key={i} cx={cx} cy={cy} r={4}
            fill={r >= 0 ? "#3bb4a4" : "#ef4444"}
            stroke="#0f172a" strokeWidth={1} opacity={0.85}
          />
        );
      })}
      {/* Axes */}
      <line x1={P.l} y1={P.t + IH} x2={P.l + IW} y2={P.t + IH} stroke="#334155" />
      <line x1={P.l} y1={P.t} x2={P.l} y2={P.t + IH} stroke="#334155" />
      <text x={P.l + IW / 2} y={H - 6} textAnchor="middle" fill="#94a3b8" fontSize={9}>
        Fitted Values
      </text>
      <text x={10} y={P.t + IH / 2} textAnchor="middle" fill="#94a3b8" fontSize={9}
        transform={`rotate(-90, 10, ${P.t + IH / 2})`}>
        Residuals
      </text>
    </svg>
  );
}

// ── Q-Q Plot ──────────────────────────────────────────────────────────────────

function QQPlot({ fit }: { fit: OLSFit }) {
  const W = 360, H = 240;
  const P = { l: 44, r: 12, t: 12, b: 36 };
  const IW = W - P.l - P.r;
  const IH = H - P.t - P.b;

  const sorted = [...fit.residuals].sort((a, b) => a - b);
  const n = sorted.length;

  // Theoretical quantiles
  const theoretical = sorted.map((_, i) => normalQuantile((i + 1) / (n + 1)));

  const tMin = Math.min(...theoretical);
  const tMax = Math.max(...theoretical);
  const tRange = tMax - tMin || 1;

  const rMin = Math.min(...sorted);
  const rMax = Math.max(...sorted);
  const rRange = rMax - rMin || 1;

  function tx(v: number): number {
    return P.l + ((v - tMin) / tRange) * IW;
  }
  function ty(r: number): number {
    return P.t + (1 - (r - rMin) / rRange) * IH;
  }

  // Reference diagonal: map tMin→rMin, tMax→rMax
  const diagX1 = tx(tMin);
  const diagY1 = ty(rMin);
  const diagX2 = tx(tMax);
  const diagY2 = ty(rMax);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      <rect x={P.l} y={P.t} width={IW} height={IH} fill="#0f172a" stroke="#1e293b" />
      {/* Reference line */}
      <line x1={diagX1} y1={diagY1} x2={diagX2} y2={diagY2}
        stroke="#475569" strokeWidth={1} strokeDasharray="4,3" />
      {/* Points */}
      {sorted.map((r, i) => (
        <circle key={i} cx={tx(theoretical[i])} cy={ty(r)} r={4}
          fill="#3bb4a4" stroke="#0f172a" strokeWidth={1} opacity={0.85}
        />
      ))}
      {/* Axes */}
      <line x1={P.l} y1={P.t + IH} x2={P.l + IW} y2={P.t + IH} stroke="#334155" />
      <line x1={P.l} y1={P.t} x2={P.l} y2={P.t + IH} stroke="#334155" />
      <text x={P.l + IW / 2} y={H - 6} textAnchor="middle" fill="#94a3b8" fontSize={9}>
        Theoretical Quantiles
      </text>
      <text x={10} y={P.t + IH / 2} textAnchor="middle" fill="#94a3b8" fontSize={9}
        transform={`rotate(-90, 10, ${P.t + IH / 2})`}>
        Sample Quantiles
      </text>
    </svg>
  );
}

// ── Progress dot ──────────────────────────────────────────────────────────────

function ProgressDot({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <GuideCompletion isComplete={allComplete} guideSlug="simple-linear-regression" score={8} />
      <div
        className={`w-2 h-2 rounded-full transition-colors duration-300 ${
          done ? "bg-[#3bb4a4]" : "bg-[#1e293b]"
        }`}
      />
      <span className={`text-[11px] ${done ? "text-white" : "text-[#475569]"}`}>
        {label}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

let _idCounter = 1000;
function nextId(): string {
  return `u${_idCounter++}`;
}

export default function SimpleRegressionClient() {
  const { data: session } = useSession();

  // Points state
  const [currentPreset, setCurrentPreset] = useState<PresetKey>("strong");
  const [points, setPoints] = useState<DataPoint[]>(() =>
    PRESET_STRONG.map((p) => ({ ...p }))
  );
  const [dragging, setDragging] = useState<{ id: string } | null>(null);

  // Display toggles
  const [showResiduals, setShowResiduals] = useState(false);
  const [showMean, setShowMean] = useState(false);

  // Prediction tool
  const [predXRaw, setPredXRaw] = useState<string>("");
  const [predictionMade, setPredictionMade] = useState(false);

  // Diagnostics
  const [diagTab, setDiagTab] = useState<"residual" | "qq" | "summary" | null>(null);
  const [diagnosticsOpened, setDiagnosticsOpened] = useState(false);

  // Progress tracking
  const [pointsInteracted, setPointsInteracted] = useState(0);
  const [presetChanged, setPresetChanged] = useState(false);
  const [residualsViewed, setResidualsViewed] = useState(false);
  const completionFired = useRef(false);

  // Compute fit
  const fit = useMemo(() => computeOLS(points), [points]);

  // Axis bounds auto-scale
  const bounds = useMemo(() => computeBounds(points), [points]);

  // Prediction
  const predX = useMemo(() => {
    const v = parseFloat(predXRaw);
    return isNaN(v) ? null : v;
  }, [predXRaw]);

  const predFit = useMemo(() => {
    if (!fit || predX === null) return null;
    return computePrediction(fit, predX);
  }, [fit, predX]);

  // Initialize prediction slider to mean X
  useEffect(() => {
    if (fit && predXRaw === "") {
      setPredXRaw(fit.meanX.toFixed(2));
    }
  }, [fit, predXRaw]);

  // Completion tracking
  const allComplete =
    pointsInteracted >= 3 &&
    presetChanged &&
    residualsViewed &&
    predictionMade &&
    diagnosticsOpened;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "simple-linear-regression", score: 8 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  // Handlers
  const handleAddPoint = useCallback(
    (dx: number, dy: number) => {
      setPoints((prev) => [...prev, { id: nextId(), x: dx, y: dy }]);
      setPointsInteracted((n) => n + 1);
    },
    []
  );

  const handleDragStart = useCallback((id: string) => {
    setDragging({ id });
  }, []);

  const handleDragMove = useCallback(
    (dx: number, dy: number) => {
      if (!dragging) return;
      const clamped = clampToData(dx, dy, bounds);
      setPoints((prev) =>
        prev.map((p) =>
          p.id === dragging.id ? { ...p, x: clamped.dx, y: clamped.dy } : p
        )
      );
      setPointsInteracted((n) => n + 1);
    },
    [dragging, bounds]
  );

  const handleDragEnd = useCallback(() => {
    setDragging(null);
  }, []);

  const handleRemovePoint = useCallback((id: string) => {
    setPoints((prev) => prev.filter((p) => p.id !== id));
    setPointsInteracted((n) => n + 1);
  }, []);

  function handlePresetChange(key: PresetKey) {
    if (key !== currentPreset) {
      setCurrentPreset(key);
      setPresetChanged(true);
    }
    setPoints(PRESETS[key].points.map((p) => ({ ...p })));
    setPredXRaw("");
  }

  function handleReset() {
    setPoints(PRESETS[currentPreset].points.map((p) => ({ ...p })));
    setPredXRaw("");
  }

  function handleToggleResiduals() {
    setShowResiduals((v) => {
      const next = !v;
      if (next) setResidualsViewed(true);
      return next;
    });
  }

  function handleDiagTab(tab: "residual" | "qq" | "summary") {
    setDiagTab((prev) => (prev === tab ? null : tab));
    setDiagnosticsOpened(true);
  }

  function handlePredXChange(val: string) {
    setPredXRaw(val);
    if (val !== "") setPredictionMade(true);
  }

  // Stats values
  const rSquared = fit?.rSquared ?? 0;
  const badge = r2Badge(rSquared);
  const rmse = fit?.rmse ?? 0;
  const residualStats = useMemo(() => {
    if (!fit) return null;
    const rs = fit.residuals;
    const minR = Math.min(...rs);
    const maxR = Math.max(...rs);
    const meanR = rs.reduce((a, b) => a + b, 0) / rs.length;
    const stdevR = Math.sqrt(
      rs.reduce((a, b) => a + (b - meanR) ** 2, 0) / rs.length
    );
    const outlierCount = rs.filter((r) => Math.abs(r) > 2 * fit.rmse).length;
    return { min: minR, max: maxR, mean: meanR, stdev: stdevR, outlierCount };
  }, [fit]);

  const progressItems = [
    { done: pointsInteracted >= 3, label: `Interact with points (${Math.min(pointsInteracted, 3)}/3)` },
    { done: presetChanged, label: "Switch preset" },
    { done: residualsViewed, label: "View residuals" },
    { done: predictionMade, label: "Use prediction tool" },
    { done: diagnosticsOpened, label: "Open diagnostics" },
  ];

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Simple Linear Regression</span>
        </nav>

        {/* Hero */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[#d4af37]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#d4af37]">
              UNIT 10: REGRESSION FOUNDATIONS
            </span>
            <span className="w-6 h-px bg-[#d4af37]" />
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3"
          >
            Simple Linear Regression:{" "}
            <span className="text-[#d4af37]">Fit the Line</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[640px]"
          >
            Place points on the scatter plot, drag them, and watch the OLS regression
            line, residuals, R², and prediction intervals update in real time.
          </motion.p>
        </section>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {progressItems.map((item) => (
            <ProgressDot key={item.label} done={item.done} label={item.label} />
          ))}
          {!session?.user && (
            <p className="text-[11px] text-[#475569] ml-auto">
              <Link href="/auth/sign-in" className="underline underline-offset-2 hover:text-[#94a3b8]">
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
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          {/* LEFT: Scatter plot */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              {/* Controls row */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <select
                  value={currentPreset}
                  onChange={(e) => handlePresetChange(e.target.value as PresetKey)}
                  className="text-[12px] bg-[#1e293b] text-white border border-[#334155] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#d4af37] cursor-pointer"
                >
                  {(Object.entries(PRESETS) as [PresetKey, { label: string }][]).map(
                    ([key, { label }]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    )
                  )}
                </select>
                <button
                  onClick={handleReset}
                  className="text-[12px] px-3 py-1.5 rounded-lg border border-[#1e293b] text-[#94a3b8] hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={handleToggleResiduals}
                  className={`text-[12px] px-3 py-1.5 rounded-lg border transition-colors ${
                    showResiduals
                      ? "border-[#94a3b8] text-white bg-[#94a3b8]/10"
                      : "border-[#1e293b] text-[#94a3b8] hover:border-[#94a3b8]"
                  }`}
                >
                  {showResiduals ? "Hide" : "Show"} Residuals
                </button>
                <button
                  onClick={() => setShowMean((v) => !v)}
                  className={`text-[12px] px-3 py-1.5 rounded-lg border transition-colors ${
                    showMean
                      ? "border-[#475569] text-white bg-[#475569]/10"
                      : "border-[#1e293b] text-[#94a3b8] hover:border-[#475569]"
                  }`}
                >
                  {showMean ? "Hide" : "Show"} Mean
                </button>
              </div>

              {/* SVG scatter */}
              <ScatterPlot
                points={points}
                fit={fit}
                bounds={bounds}
                showResiduals={showResiduals}
                showMean={showMean}
                predX={predX}
                predFit={predFit}
                onAddPoint={handleAddPoint}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                onRemovePoint={handleRemovePoint}
              />
              <p className="text-[10px] text-[#334155] mt-2 text-center">
                Click to add point · Drag to move · Right-click to remove
              </p>
            </div>
          </div>

          {/* RIGHT: Stats panel */}
          <div className="space-y-4">
            {/* R² headline */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569]">
                  Goodness of Fit
                </span>
                <span
                  className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                  style={{ color: badge.color, background: badge.color + "18" }}
                >
                  {badge.label}
                </span>
              </div>
              <motion.p
                className="text-5xl font-black mb-1"
                style={{ color: "#d4af37" }}
                animate={{ opacity: [0.5, 1] }}
                key={rSquared.toFixed(3)}
                transition={{ duration: 0.3 }}
              >
                R² = {rSquared.toFixed(2)}
              </motion.p>
              <p className="text-[11px] text-[#475569] mb-4">
                {(rSquared * 100).toFixed(1)}% of variance in y explained by x
              </p>

              {/* R² visualizer bar */}
              <div className="relative h-5 rounded-full bg-[#1e293b] overflow-hidden mb-1">
                <motion.div
                  className="h-full rounded-full bg-[#1e5d8a]"
                  animate={{ width: `${Math.max(0, rSquared * 100)}%` }}
                  transition={{ duration: 0.35 }}
                />
                <motion.div
                  className="absolute top-0 h-full rounded-r-full"
                  style={{
                    background: "#334155",
                    left: `${Math.max(0, rSquared * 100)}%`,
                    right: 0,
                  }}
                  animate={{ left: `${Math.max(0, rSquared * 100)}%` }}
                  transition={{ duration: 0.35 }}
                />
                <div className="absolute inset-0 flex items-center justify-between px-2">
                  {rSquared > 0.12 && (
                    <span className="text-[9px] font-semibold text-white/80">
                      {(rSquared * 100).toFixed(0)}% explained
                    </span>
                  )}
                  {rSquared < 0.88 && (
                    <span className="text-[9px] text-[#475569] ml-auto">
                      {((1 - rSquared) * 100).toFixed(0)}% unexplained
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-between text-[9px] text-[#475569] mt-0.5">
                <span style={{ color: "#1e5d8a" }}>Explained (R²)</span>
                <span style={{ color: "#334155" }}>Unexplained (1−R²)</span>
              </div>
            </div>

            {/* Coefficients + stats */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">
                Model Coefficients
              </p>
              <div className="space-y-2.5">
                {fit ? (
                  <>
                    <StatRow label="Slope (b)" value={fit.slope.toFixed(4)} color="#3bb4a4"
                      note={`For each unit ↑ in x, y changes by ${fit.slope.toFixed(3)}`}
                    />
                    <StatRow label="Intercept (a)" value={fit.intercept.toFixed(4)} color="#d4af37" />
                    <StatRow label="RMSE" value={`±${rmse.toFixed(3)}`} color="#ef4444"
                      note={`Average prediction error: ±${rmse.toFixed(3)}`}
                    />
                    <StatRow label="Pearson r" value={fit.pearsonR.toFixed(4)} color="#a855f7" />
                    <StatRow label="n" value={`${fit.n} data points`} color="#475569" />
                  </>
                ) : (
                  <p className="text-[11px] text-[#334155]">Need at least 2 points</p>
                )}
              </div>
            </div>

            {/* Prediction tool */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">
                Prediction Tool
              </p>
              <label className="block text-[11px] text-[#94a3b8] mb-1.5">
                Enter X value
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="number"
                  value={predXRaw}
                  onChange={(e) => handlePredXChange(e.target.value)}
                  step={0.1}
                  className="flex-1 text-[12px] bg-[#1e293b] text-white border border-[#334155] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#d4af37]"
                  placeholder={fit ? fit.meanX.toFixed(2) : "x value"}
                />
                <input
                  type="range"
                  min={bounds.xMin.toFixed(2)}
                  max={bounds.xMax.toFixed(2)}
                  step={((bounds.xMax - bounds.xMin) / 100).toFixed(3)}
                  value={predXRaw || (fit ? fit.meanX.toFixed(2) : "0")}
                  onChange={(e) => handlePredXChange(e.target.value)}
                  className="flex-1 accent-[#d4af37]"
                />
              </div>
              {predFit && predX !== null ? (
                <div className="space-y-1.5 text-[12px]">
                  <div className="flex justify-between items-center">
                    <span className="text-[#94a3b8]">Predicted ŷ</span>
                    <span className="font-mono font-bold text-[#d4af37]">{predFit.yHat.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#94a3b8]">95% CI</span>
                    <span className="font-mono text-[#3bb4a4]">
                      [{predFit.ciLower.toFixed(2)}, {predFit.ciUpper.toFixed(2)}]
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#94a3b8]">95% PI</span>
                    <span className="font-mono text-[#a855f7]">
                      [{predFit.piLower.toFixed(2)}, {predFit.piUpper.toFixed(2)}]
                    </span>
                  </div>
                  <p className="text-[10px] text-[#475569] mt-2 leading-relaxed border-t border-[#1e293b] pt-2">
                    PI is wider — it accounts for individual variation around the mean line.
                    The CI estimates where the true mean response falls; the PI covers
                    where a new individual observation will likely land.
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-[#334155]">
                  {fit ? "Enter an x value to see predictions" : "Need at least 2 points"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Residual diagnostics (expandable) */}
        <div className="mt-6">
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] overflow-hidden">
            <div className="p-5 border-b border-[#1e293b] flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-white">Residual Diagnostics</p>
                <p className="text-[11px] text-[#475569] mt-0.5">
                  Inspect residual patterns to check OLS assumptions
                </p>
              </div>
              <div className="flex gap-2">
                {(["residual", "qq", "summary"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleDiagTab(tab)}
                    className={`text-[11px] px-3 py-1.5 rounded-lg border transition-colors ${
                      diagTab === tab
                        ? "border-[#d4af37] text-[#d4af37] bg-[#d4af37]/10"
                        : "border-[#1e293b] text-[#94a3b8] hover:border-[#334155] hover:text-white"
                    }`}
                  >
                    {tab === "residual" ? "Residual Plot" : tab === "qq" ? "Q-Q Plot" : "Summary"}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence>
              {diagTab && fit && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-5">
                    {diagTab === "residual" && (
                      <div className="max-w-[400px]">
                        <p className="text-[11px] text-[#475569] mb-3">
                          Residuals vs Fitted Values. A random scatter around zero is ideal.
                          Patterns suggest non-linearity or heteroscedasticity.
                        </p>
                        <ResidualPlot fit={fit} />
                      </div>
                    )}
                    {diagTab === "qq" && (
                      <div className="max-w-[400px]">
                        <p className="text-[11px] text-[#475569] mb-3">
                          Q-Q plot of residuals. Points close to the diagonal suggest
                          normality — important for valid inference.
                        </p>
                        <QQPlot fit={fit} />
                      </div>
                    )}
                    {diagTab === "summary" && residualStats && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-[600px]">
                        <SummaryCard label="Min Residual" value={residualStats.min.toFixed(3)} color="#ef4444" />
                        <SummaryCard label="Max Residual" value={residualStats.max.toFixed(3)} color="#3bb4a4" />
                        <SummaryCard label="Mean Residual" value={residualStats.mean.toFixed(4)} color="#94a3b8" />
                        <SummaryCard label="Std Dev" value={residualStats.stdev.toFixed(3)} color="#d4af37" />
                        <SummaryCard label="RMSE" value={rmse.toFixed(3)} color="#a855f7" />
                        <SummaryCard
                          label="Outliers (|r|>2σ)"
                          value={`${residualStats.outlierCount} / ${fit.n}`}
                          color={residualStats.outlierCount > 0 ? "#ef4444" : "#3bb4a4"}
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
              {diagTab && !fit && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-5"
                >
                  <p className="text-[12px] text-[#475569]">Add at least 2 points to see diagnostics.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Concept cards */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              title: "OLS Principle",
              body: "Ordinary Least Squares minimises the sum of squared residuals — the total vertical distance² between each point and the fitted line.",
              color: "#3bb4a4",
            },
            {
              title: "R² Explained",
              body: "R² = 1 − SSE/SST. It measures the proportion of variance in y explained by x. A value near 1 means the model fits well.",
              color: "#d4af37",
            },
            {
              title: "PI vs CI",
              body: "The 95% CI covers the true mean response at x*. The 95% PI covers where a new individual observation will fall — always wider.",
              color: "#a855f7",
            },
          ].map(({ title, body, color }) => (
            <div key={title} className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold mb-2" style={{ color }}>
                {title}
              </p>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        {/* Footer nav */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link
            href="/visual-guides/simpsons-paradox"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            ← Simpson&apos;s Paradox
          </Link>
          <Link
            href="/visual-guides/multiple-regression-confounding"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            Multiple Regression →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Helper sub-components ─────────────────────────────────────────────────────

function StatRow({
  label,
  value,
  color,
  note,
}: {
  label: string;
  value: string;
  color: string;
  note?: string;
}) {
  return (
    <div>
      <div className="flex justify-between items-baseline">
        <span className="text-[11px] text-[#475569]">{label}</span>
        <motion.span
          className="text-[12px] font-mono font-bold"
          style={{ color }}
          animate={{ opacity: [0.5, 1] }}
          key={value}
          transition={{ duration: 0.25 }}
        >
          {value}
        </motion.span>
      </div>
      {note && (
        <p className="text-[10px] text-[#334155] mt-0.5 leading-snug">{note}</p>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-[#1e293b] p-3">
      <p className="text-[10px] text-[#475569] mb-1">{label}</p>
      <p className="text-[14px] font-mono font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
