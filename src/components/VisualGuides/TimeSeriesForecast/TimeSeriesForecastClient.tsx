"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import type { DatasetId, TimeSeriesData, DecompositionResult } from "./types";
import TimeSeriesPlot from "./TimeSeriesPlot";
import DecompositionViewer from "./DecompositionViewer";
import SmoothingControls from "./SmoothingControls";
import ForecastPlot from "./ForecastPlot";
import TemporalLeakageWarning from "./TemporalLeakageWarning";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

// ── Deterministic LCG ─────────────────────────────────────────────────────────

function lcg(seed: number): number {
  return (((seed * 1664525 + 1013904223) >>> 0) / 0xffffffff);
}

// ── Label generation ──────────────────────────────────────────────────────────

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function generateLabels(): string[] {
  const labels: string[] = [];
  for (let yr = 2020; yr <= 2023; yr++) {
    for (let m = 0; m < 12; m++) {
      labels.push(`${MONTH_ABBR[m]} ${String(yr).slice(2)}`);
    }
  }
  return labels; // 48 labels
}

// ── Data generation ───────────────────────────────────────────────────────────

function generateRetailSales(): number[] {
  const values: number[] = [];
  for (let t = 0; t < 48; t++) {
    const trend = 1000 + t * 15;
    const seasonal = 200 * Math.sin((2 * Math.PI * t) / 12);
    // Deterministic noise using LCG seeded by position
    const noise = (lcg(t * 17 + 3) - 0.5) * 60;
    values.push(Math.round(trend + seasonal + noise));
  }
  return values;
}

function generateStockPrice(): number[] {
  const values: number[] = [100];
  for (let t = 1; t < 48; t++) {
    const prev = values[t - 1];
    // Random walk with slight upward drift
    const step = (lcg(t * 31 + 7) - 0.48) * 8;
    values.push(Math.max(20, parseFloat((prev + step).toFixed(2))));
  }
  return values;
}

function generateTemperature(): number[] {
  const values: number[] = [];
  for (let t = 0; t < 48; t++) {
    const trend = 10;
    // Oslo-like: coldest in winter (t=0 = Jan), warmest in summer (t=6 = Jul)
    const seasonal = 15 * Math.cos((2 * Math.PI * (t - 6)) / 12);
    const noise = (lcg(t * 13 + 11) - 0.5) * 4;
    values.push(parseFloat((trend + seasonal + noise).toFixed(1)));
  }
  return values;
}

const DATASETS: Record<DatasetId, TimeSeriesData> = {
  retail: { labels: generateLabels(), values: generateRetailSales() },
  stock: { labels: generateLabels(), values: generateStockPrice() },
  temperature: { labels: generateLabels(), values: generateTemperature() },
};

// ── Decomposition ─────────────────────────────────────────────────────────────

function computeDecomposition(values: number[]): DecompositionResult {
  const n = values.length;
  const window = 12;

  // 1. Trend: centered moving average with window=12
  const trend = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    const half = window / 2;
    const lo = Math.max(0, i - Math.floor(half));
    const hi = Math.min(n - 1, i + Math.floor(half) - (window % 2 === 0 ? 1 : 0));
    let sum = 0;
    let cnt = 0;
    for (let j = lo; j <= hi; j++) {
      sum += values[j];
      cnt++;
    }
    trend[i] = sum / cnt;
  }

  // 2. Detrended: original - trend
  const detrended = values.map((v, i) => v - trend[i]);

  // 3. Seasonal: average by month position (0-11)
  const monthSums = new Array<number>(12).fill(0);
  const monthCounts = new Array<number>(12).fill(0);
  for (let i = 0; i < n; i++) {
    const m = i % 12;
    monthSums[m] += detrended[i];
    monthCounts[m]++;
  }
  const seasonalPattern = monthSums.map((s, m) => s / monthCounts[m]);

  // Centre seasonal component (mean should be ~0)
  const seasonalMean = seasonalPattern.reduce((a, b) => a + b, 0) / 12;
  const centeredSeasonal = seasonalPattern.map((v) => v - seasonalMean);

  // Expand to full length
  const seasonal = values.map((_, i) => centeredSeasonal[i % 12]);

  // 4. Residual
  const residual = values.map((v, i) => v - trend[i] - seasonal[i]);

  return { trend, seasonal, residual };
}

// ── Smoothing ─────────────────────────────────────────────────────────────────

function computeMA(values: number[], window: number): number[] {
  const n = values.length;
  const result: number[] = [];
  const half = Math.floor(window / 2);
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - half);
    const hi = Math.min(n - 1, i + half);
    let sum = 0;
    let cnt = 0;
    for (let j = lo; j <= hi; j++) {
      sum += values[j];
      cnt++;
    }
    result.push(sum / cnt);
  }
  return result;
}

function computeES(values: number[], alpha: number): number[] {
  const result: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

// ── Model fitting (uses ONLY the data it is given) ───────────────────────────

interface FittedModel {
  slope: number;
  trendAnchor: number; // estimated trend level at the last point of the fitting data
  residStd: number;
  seasonalPattern: number[]; // 12 monthly offsets learned from the fitting data
}

function fitModel(train: number[]): FittedModel {
  const decomp = computeDecomposition(train);
  const nTrain = train.length;

  // Seasonal pattern (average offset per calendar month, fitting data only)
  const seasonalPattern = Array.from({ length: 12 }, (_, m) => {
    const mVals = decomp.seasonal.filter((_, i) => i % 12 === m);
    return mVals.reduce((a, b) => a + b, 0) / mVals.length;
  });

  // Fit a linear trend by ordinary least squares to the deseasonalized
  // training values (raw value minus seasonal offset). Fitting on the raw
  // deseasonalized series avoids the end-of-series bias of the centred
  // moving average, whose window is truncated near the boundary.
  const deseasonalized = train.map((v, i) => v - seasonalPattern[i % 12]);
  const xBar = (nTrain - 1) / 2;
  const yBar = deseasonalized.reduce((a, b) => a + b, 0) / nTrain;
  let sxy = 0,
    sxx = 0;
  for (let i = 0; i < nTrain; i++) {
    sxy += (i - xBar) * (deseasonalized[i] - yBar);
    sxx += (i - xBar) ** 2;
  }
  const slope = sxx !== 0 ? sxy / sxx : 0;
  // Fitted trend line evaluated at the last training point
  const trendAnchor = yBar + slope * (nTrain - 1 - xBar);

  // Residual std of THIS model (trend line + seasonal) on the fitting data only
  const modelResiduals = train.map(
    (v, i) => v - (yBar + slope * (i - xBar) + seasonalPattern[i % 12])
  );
  const residStd =
    Math.sqrt(modelResiduals.reduce((acc, v) => acc + v * v, 0) / nTrain) || 1;

  return { slope, trendAnchor, residStd, seasonalPattern };
}

function forecastAhead(
  model: FittedModel,
  trainLen: number,
  horizonMonths: number
): { forecastValues: number[]; upperBound: number[]; lowerBound: number[] } {
  const forecastValues: number[] = [];
  const upperBound: number[] = [];
  const lowerBound: number[] = [];

  for (let h = 1; h <= horizonMonths; h++) {
    const forecast =
      model.trendAnchor +
      model.slope * h +
      model.seasonalPattern[(trainLen + h - 1) % 12];

    // Simplified interval heuristic (see note in the forecast section)
    const pi = 1.96 * model.residStd * Math.sqrt(1 + h / trainLen);

    forecastValues.push(parseFloat(forecast.toFixed(2)));
    upperBound.push(parseFloat((forecast + pi).toFixed(2)));
    lowerBound.push(parseFloat((forecast - pi).toFixed(2)));
  }

  return { forecastValues, upperBound, lowerBound };
}

// ── Forecast for display (fit on all 48 months, project into 2024) ───────────

interface ForecastResult {
  forecastValues: number[];
  upperBound: number[];
  lowerBound: number[];
  forecastLabels: string[];
}

function computeForecast(values: number[], horizonMonths: number = 12): ForecastResult {
  const model = fitModel(values);
  const { forecastValues, upperBound, lowerBound } = forecastAhead(
    model,
    values.length,
    horizonMonths
  );

  // Forecast labels: Jan 24 .. Dec 24
  const forecastLabels: string[] = [];
  let yr = 2024;
  let mo = 0;
  for (let h = 0; h < horizonMonths; h++) {
    forecastLabels.push(`${MONTH_ABBR[mo]} ${String(yr).slice(2)}`);
    mo++;
    if (mo >= 12) {
      mo = 0;
      yr++;
    }
  }

  return { forecastValues, upperBound, lowerBound, forecastLabels };
}

// ── Honest hold-out accuracy ──────────────────────────────────────────────────
// Fit on the first 36 months ONLY, forecast the final 12, and score those
// forecasts against the held-out actuals the model never saw. Fitting on the
// full series and then "evaluating" on its last 12 months would be temporal
// leakage: the centred-moving-average trend and the seasonal averages would
// already contain the hold-out values.

function computeAccuracy(values: number[]): { mae: number; rmse: number; mape: number } {
  const holdout = 12;
  const trainLen = values.length - holdout;
  const train = values.slice(0, trainLen);

  const model = fitModel(train);
  const { forecastValues } = forecastAhead(model, trainLen, holdout);

  const holdoutActual = values.slice(trainLen);
  const errors = holdoutActual.map((a, i) => a - forecastValues[i]);
  const mae = errors.reduce((s, e) => s + Math.abs(e), 0) / errors.length;
  const rmse = Math.sqrt(errors.reduce((s, e) => s + e * e, 0) / errors.length);
  const mape =
    (holdoutActual.reduce((s, a, i) => s + Math.abs(errors[i]) / Math.abs(a), 0) /
      errors.length) *
    100;

  return { mae, rmse, mape };
}

// ── Dataset config ────────────────────────────────────────────────────────────

const DATASET_CONFIG: Record<
  DatasetId,
  { label: string; unit: string; description: string; color: string }
> = {
  retail: {
    label: "Retail Sales",
    unit: "$",
    description: "Monthly retail revenue with strong trend and seasonality (4 years, 2020–2023).",
    color: "#3bb4a4",
  },
  stock: {
    label: "Stock Price",
    unit: "$",
    description: "Monthly stock price as a random walk with slight upward drift.",
    color: "#a855f7",
  },
  temperature: {
    label: "Temperature",
    unit: "°C",
    description: "Monthly average temperature (Oslo-style), dominated by annual seasonality.",
    color: "#d4af37",
  },
};

// ── Main component ────────────────────────────────────────────────────────────

export default function TimeSeriesForecastClient() {
  const { data: session } = useSession();
  const completionFired = useRef(false);

  const [activeDataset, setActiveDataset] = useState<DatasetId>("retail");
  const [maWindow, setMaWindow] = useState(12);
  const [alpha, setAlpha] = useState(0.2);
  const [datasetsExplored, setDatasetsExplored] = useState<Set<string>>(new Set(["retail"]));
  const [smoothingAdjusted, setSmoothingAdjusted] = useState(false);
  const [leakageRead, setLeakageRead] = useState(false);

  const isComplete = datasetsExplored.size >= 2 && smoothingAdjusted && leakageRead;

  useEffect(() => {
    if (isComplete && !completionFired.current) {
      completionFired.current = true;
      if (session?.user) {
        fetch("/api/visual-guides/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideSlug: "time-series-forecasting", score: 100 }),
        }).catch(() => {});
      }
    }
  }, [isComplete, session?.user]);

  const { values, labels } = DATASETS[activeDataset];

  const decomposition = useMemo<DecompositionResult>(
    () => computeDecomposition(values),
    [values]
  );

  const maSmoothed = useMemo(() => computeMA(values, maWindow), [values, maWindow]);
  const esSmoothed = useMemo(() => computeES(values, alpha), [values, alpha]);

  const forecast = useMemo(() => computeForecast(values), [values]);

  const accuracy = useMemo(() => computeAccuracy(values), [values]);

  function handleDatasetChange(id: DatasetId) {
    setActiveDataset(id);
    setDatasetsExplored((prev) => new Set([...prev, id]));
  }

  function handleReset() {
    setActiveDataset("retail");
    setMaWindow(12);
    setAlpha(0.2);
    setDatasetsExplored(new Set(["retail"]));
    setSmoothingAdjusted(false);
    setLeakageRead(false);
    completionFired.current = false;
  }

  const cfg = DATASET_CONFIG[activeDataset];

  // Progress items
  const progressItems = [
    {
      id: "datasets",
      label: `Explore datasets (${datasetsExplored.size}/2)`,
      done: datasetsExplored.size >= 2,
    },
    { id: "smoothing", label: "Adjust smoothing", done: smoothingAdjusted },
    { id: "leakage", label: "Read leakage warning", done: leakageRead },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="time-series-forecasting" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">
        {/* Hero */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              Unit 13: Time Series & Forecasting
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3"
          >
            Time Series{" "}
            <span className="text-[var(--color-accent)]">Fundamentals & Forecasting</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[640px]"
          >
            Explore decomposition, trend, seasonality, smoothing, and forecasting with prediction
            intervals across three real-world datasets. Learn to spot and prevent temporal leakage.
          </motion.p>
        </section>

        {/* Progress tracker */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          {progressItems.map((item) => (
            <div key={item.id} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full transition-colors duration-300"
                style={{ background: item.done ? "#3bb4a4" : "#1e293b" }}
              />
              <span
                className={`text-[11px] transition-colors ${item.done ? "text-white" : "text-[#475569]"}`}
              >
                {item.label}
              </span>
            </div>
          ))}
          {!session?.user && (
            <p className="text-[11px] text-[#475569] ml-auto">
              <Link href="/auth/sign-in" className="underline underline-offset-2 hover:text-[#94a3b8]">
                Sign in
              </Link>{" "}
              to save progress
            </p>
          )}
          <AnimatePresence>
            {isComplete && (
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

        {/* Dataset selector */}
        <div className="mb-6">
          <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wide mb-2">
            Select Dataset
          </p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(DATASET_CONFIG) as DatasetId[]).map((id) => {
              const c = DATASET_CONFIG[id];
              const active = activeDataset === id;
              const explored = datasetsExplored.has(id);
              return (
                <button
                  key={id}
                  onClick={() => handleDatasetChange(id)}
                  className={`relative px-4 py-2.5 rounded-xl text-[12px] font-semibold border transition-all ${
                    active
                      ? "text-[#0f172a]"
                      : "border-[#1e293b] text-[#94a3b8] hover:border-[#334155] hover:text-white"
                  }`}
                  style={active ? { background: c.color, borderColor: c.color } : undefined}
                >
                  {c.label}
                  {explored && !active && (
                    <span className="ml-1.5 text-[9px] text-[#3bb4a4]">✓</span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[12px] text-[#475569]">{cfg.description}</p>
        </div>

        {/* Main grid */}
        <div className="space-y-6">
          {/* Section 1: Original Series */}
          <motion.div
            key={activeDataset}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[13px] font-semibold text-white">Original Time Series</p>
                <p className="text-[11px] text-[#475569] mt-0.5">
                  48 monthly observations, 2020–2023
                </p>
              </div>
              <span
                className="text-[11px] font-semibold px-3 py-1 rounded-full"
                style={{ color: cfg.color, background: cfg.color + "18" }}
              >
                {cfg.unit} / month
              </span>
            </div>
            <TimeSeriesPlot
              values={values}
              labels={labels}
              color={cfg.color}
              height={220}
            />
          </motion.div>

          {/* Section 2: Decomposition */}
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
            <div className="mb-4">
              <p className="text-[13px] font-semibold text-white mb-1">
                Additive Decomposition
              </p>
              <p className="text-[12px] text-[#475569] leading-relaxed">
                Separates the series into trend, seasonal, and residual components.
                Trend is extracted with a 12-month centred moving average; seasonal
                is the average deviation from trend by calendar month.
              </p>
            </div>
            <DecompositionViewer
              original={values}
              decomposition={decomposition}
              labels={labels}
            />
          </div>

          {/* Section 3: Smoothing */}
          <div>
            <div className="mb-3">
              <p className="text-[13px] font-semibold text-white mb-1">
                Smoothing Methods
              </p>
              <p className="text-[12px] text-[#475569]">
                Adjust the sliders to see how each method handles noise.
              </p>
            </div>
            <SmoothingControls
              values={values}
              labels={labels}
              maWindow={maWindow}
              alpha={alpha}
              maSmoothed={maSmoothed}
              esSmoothed={esSmoothed}
              onMaChange={setMaWindow}
              onAlphaChange={setAlpha}
              onSmoothingAdjusted={() => setSmoothingAdjusted(true)}
            />
          </div>

          {/* Section 4: Forecast */}
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
            <div className="mb-4">
              <p className="text-[13px] font-semibold text-white mb-1">
                12-Month Forecast with Prediction Intervals
              </p>
              <p className="text-[12px] text-[#475569] leading-relaxed">
                Extends a linear trend fitted by least squares to the deseasonalized
                history, plus the learned monthly seasonal pattern. The shaded band
                widens with the forecast horizon using a simplified rule of thumb,
                PI ≈ ŷ ± 1.96 · σ · √(1 + h/n). Real forecasting libraries derive
                interval width from the fitted model (for example ARIMA state-space
                variances) rather than this shortcut.
              </p>
            </div>
            <ForecastPlot
              data={{
                historicalValues: values,
                historicalLabels: labels,
                forecastValues: forecast.forecastValues,
                forecastLabels: forecast.forecastLabels,
                upperBound: forecast.upperBound,
                lowerBound: forecast.lowerBound,
              }}
            />
          </div>

          {/* Section 5: Accuracy metrics */}
          <div>
            <p className="text-[13px] font-semibold text-white mb-3">
              Hold-Out Accuracy (fit on 2020&ndash;2022, evaluated on 2023)
            </p>
            <p className="text-[12px] text-[#475569] leading-relaxed mb-3 max-w-[640px]">
              The model is fit on the first 36 months only, then forecasts the final 12
              months it never saw. The metrics below compare those forecasts against the
              held-out 2023 actuals. Scoring a model on data it was fit on would be{" "}
              <Link
                href="/visual-guides/data-leakage"
                className="underline underline-offset-2 text-[#94a3b8] hover:text-white"
              >
                data leakage
              </Link>
              , and the numbers would look better than the model deserves.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  label: "MAE",
                  value: accuracy.mae.toFixed(2),
                  unit: cfg.unit,
                  description: "Mean Absolute Error: average unsigned forecast error.",
                  color: "#3bb4a4",
                },
                {
                  label: "RMSE",
                  value: accuracy.rmse.toFixed(2),
                  unit: cfg.unit,
                  description: "Root Mean Squared Error: penalises large errors more than MAE.",
                  color: "var(--color-accent)",
                },
                {
                  label: "MAPE",
                  value: accuracy.mape.toFixed(1),
                  unit: "%",
                  description: "Mean Absolute Percentage Error: scale-free relative accuracy.",
                  color: "#a855f7",
                },
              ].map((m) => (
                <div
                  key={m.label}
                  className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: m.color }}>
                    {m.label}
                  </p>
                  <p className="text-3xl font-black mb-0.5" style={{ color: m.color }}>
                    {m.value}
                    <span className="text-base font-semibold ml-1 opacity-70">{m.unit}</span>
                  </p>
                  <p className="text-[11px] text-[#475569] leading-relaxed mt-1">
                    {m.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 6: Temporal Leakage Warning */}
          <div>
            <p className="text-[13px] font-semibold text-white mb-3">
              Critical Concept
            </p>
            <TemporalLeakageWarning
              onRead={() => setLeakageRead(true)}
              alreadyRead={leakageRead}
            />
          </div>

          {/* Concept cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                title: "Stationarity",
                body: "A series is stationary when its mean, variance, and autocorrelation do not change over time. Many forecasting models require stationarity, achieved through differencing or log transforms.",
                color: "#3bb4a4",
              },
              {
                title: "Autocorrelation (ACF)",
                body: "The correlation of a series with a lagged version of itself. Seasonal series show spikes at lags 12, 24 in monthly data. The ACF guides lag selection in ARIMA models.",
                color: "var(--color-accent)",
              },
              {
                title: "Walk-Forward Validation",
                body: "The correct CV strategy for time series: train on all data up to time t, predict t+1..t+h, advance by one step. Never shuffle time series data for cross-validation.",
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
        </div>

        {/* Completion card */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.65 }}
              className="mt-8 rounded-2xl border border-white/[0.08] bg-[#0f172a] overflow-hidden"
            >
              <div className="px-6 pt-6 pb-4 border-b border-white/[0.07]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-px bg-[var(--color-accent)]" />
                  <span className="text-[10px] font-semibold uppercase tracking-[2px] text-[var(--color-accent)]">
                    Guide Complete
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-white">
                  Time Series Mastered!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You&apos;ve explored decomposition, smoothing, forecasting, and the critical pitfall of temporal leakage.
                </p>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Datasets explored", value: `${datasetsExplored.size} / 3`, color: "#3bb4a4" },
                    { label: "Smoothing methods", value: "MA + ES", color: "var(--color-accent)" },
                    { label: "Leakage pitfall", value: "Understood", color: "#a855f7" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-[#1e293b] p-3">
                      <p className="text-[10px] text-[#475569] mb-1">{item.label}</p>
                      <p className="text-[14px] font-mono font-bold" style={{ color: item.color }}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Time always flows one way. Your model must respect that: training on the future to predict the past is the fastest path to a misleadingly optimistic evaluation.&quot;
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-3">
                <Link
                  href="/visual-guides"
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
                >
                  ← All Guides
                </Link>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
                  >
                    Try Again
                  </button>
                  <Link
                    href="/visual-guides/outlier-detection"
                    className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
                  >
                    Next Guide →
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer nav */}
        {!isComplete && (
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
            <Link
              href="/visual-guides"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
            >
              ← All Guides
            </Link>
            <Link
              href="/visual-guides/outlier-detection"
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
            >
              Next Guide →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
