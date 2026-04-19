"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onRead: () => void;
  alreadyRead: boolean;
}

export default function TemporalLeakageWarning({ onRead, alreadyRead }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-orange-900/50 bg-orange-950/20 overflow-hidden">
      {/* Header */}
      <div
        className="p-5 flex items-start gap-3 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="mt-0.5 w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f97316"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-orange-400 mb-0.5">
            Critical Pitfall: Temporal Data Leakage
          </p>
          <p className="text-[12px] text-orange-300/60">
            The most common mistake in time series modeling — and how to avoid it.
            {!expanded && (
              <span className="ml-1 text-[11px] text-orange-400/70 underline underline-offset-2">
                Click to expand
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {alreadyRead && (
            <span className="text-[10px] font-semibold text-[#3bb4a4] flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Read
            </span>
          )}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f97316"
            strokeWidth="2"
            className={`transition-transform duration-200 opacity-60 ${expanded ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Expandable content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-5 border-t border-orange-900/30">
              {/* What is it */}
              <div className="pt-4">
                <p className="text-[12px] font-semibold text-orange-400 mb-2 uppercase tracking-wide">
                  What Is Temporal Leakage?
                </p>
                <p className="text-[12px] text-orange-200/70 leading-relaxed">
                  Temporal leakage occurs when future information is accidentally used to train or
                  evaluate a model that should only use past data. Unlike random cross-validation,
                  time series data has a strict temporal order: tomorrow&apos;s values cannot be used
                  to predict today&apos;s.
                </p>
              </div>

              {/* Classic example */}
              <div className="rounded-xl bg-orange-950/40 border border-orange-900/40 p-4">
                <p className="text-[11px] font-semibold text-orange-400 mb-2 uppercase tracking-wide">
                  Classic Example
                </p>
                <p className="text-[12px] text-orange-200/70 leading-relaxed mb-2">
                  Suppose you normalise a feature (e.g., monthly sales) using the <em>global</em> min/max
                  across all 48 months before splitting into train/test. The normalisation parameters
                  were computed using test-set values — future data leaked into the training pipeline.
                  Your model will appear to perform far better than it would in production.
                </p>
                <div className="bg-[#1e293b]/60 rounded-lg p-3 font-mono text-[11px]">
                  <p className="text-[#ef4444] mb-1">
                    {`# WRONG — leaks test data into scaler`}
                  </p>
                  <p className="text-[#94a3b8]">{`scaler.fit(all_data)  # includes future!`}</p>
                  <p className="text-[#94a3b8] mb-3">{`X_train = scaler.transform(train)`}</p>
                  <p className="text-[#3bb4a4] mb-1">
                    {`# CORRECT — fit only on training data`}
                  </p>
                  <p className="text-[#94a3b8]">{`scaler.fit(train_data)  # past only`}</p>
                  <p className="text-[#94a3b8]">{`X_test  = scaler.transform(test_data)`}</p>
                </div>
              </div>

              {/* How to prevent */}
              <div>
                <p className="text-[11px] font-semibold text-orange-400 mb-2 uppercase tracking-wide">
                  How to Prevent It
                </p>
                <ul className="space-y-2">
                  {[
                    {
                      text: "Always use walk-forward (expanding or rolling window) cross-validation — never random k-fold.",
                      icon: "📅",
                    },
                    {
                      text: "Fit all preprocessing transformers (scalers, encoders, imputers) only on training data, then apply them to test/validation.",
                      icon: "🔒",
                    },
                    {
                      text: "Never include lag features that look beyond the current timestamp when computing forecasting targets.",
                      icon: "⏱",
                    },
                    {
                      text: "Set a strict cutoff date: data before the cutoff = training, data after = held-out test. Never mix these sets.",
                      icon: "✂",
                    },
                    {
                      text: "When using seasonal decomposition for feature engineering, re-fit the decomposition on each training fold.",
                      icon: "🔄",
                    },
                  ].map((item) => (
                    <li key={item.text} className="flex items-start gap-2.5">
                      <span className="text-[13px] mt-0.5 flex-shrink-0">{item.icon}</span>
                      <span className="text-[12px] text-orange-200/70 leading-relaxed">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mark as read button */}
              {!alreadyRead && (
                <button
                  onClick={() => {
                    onRead();
                  }}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30 hover:bg-orange-500/30 transition-colors"
                >
                  Mark as Read
                </button>
              )}

              {alreadyRead && (
                <div className="flex items-center gap-2 text-[12px] text-[#3bb4a4]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Marked as read — well done for taking this seriously!
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
