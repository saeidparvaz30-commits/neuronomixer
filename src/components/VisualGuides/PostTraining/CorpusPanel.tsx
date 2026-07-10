"use client";

import React, { useState } from "react";
import {
  BASE_CORPUS,
  SFT_CORPUS,
  PREF_PAIRS,
  VOCAB,
  REWARDS,
  corpusStats,
} from "./postTrainingMath";

type TabId = "base" | "demo" | "pairs";

const TABS: { id: TabId; label: string }[] = [
  { id: "base", label: "Base corpus (raw web text)" },
  { id: "demo", label: "Demonstrations (SFT data)" },
  { id: "pairs", label: "Preference pairs" },
];

/**
 * Shows every piece of training data the guide uses, so the user can see
 * that the distributions in the sandbox are computed from visible text.
 */
export default function CorpusPanel() {
  const [tab, setTab] = useState<TabId>("base");

  const baseStats = corpusStats(BASE_CORPUS);
  const demoStats = corpusStats(SFT_CORPUS);

  const rewardedTokens = VOCAB.map((w, i) => ({ token: w, reward: REWARDS[i] })).filter(
    (t) => t.reward !== 0
  );

  return (
    <div>
      <div role="radiogroup" aria-label="Training data source" className="flex flex-wrap gap-2 mb-4">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="radio"
              aria-checked={active}
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-2 rounded-xl text-[12px] font-semibold border transition-colors ${
                active
                  ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[#d4af37]/5"
                  : "border-[#1e293b] text-[#94a3b8] hover:border-[#334155] hover:text-white"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "base" && (
        <div>
          <p className="text-[11px] text-[#475569] mb-2">
            {baseStats.lines} lines, {baseStats.tokens} tokens. The base bigram model is trained on
            exactly these lines, nothing else.
          </p>
          <div className="rounded-xl border border-[#1e293b] bg-[#1e293b]/40 p-4 font-mono text-[11px] leading-relaxed text-[#94a3b8]">
            {BASE_CORPUS.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>
      )}

      {tab === "demo" && (
        <div>
          <p className="text-[11px] text-[#475569] mb-2">
            {demoStats.lines} lines, {demoStats.tokens} tokens. Assistant-style demonstrations: the
            demonstration bigram model is trained on exactly these lines.
          </p>
          <div className="rounded-xl border border-[#1e293b] bg-[#1e293b]/40 p-4 font-mono text-[11px] leading-relaxed text-[#3bb4a4]">
            {SFT_CORPUS.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>
      )}

      {tab === "pairs" && (
        <div>
          <p className="text-[11px] text-[#475569] mb-2">
            {PREF_PAIRS.length} authored judgments. Each pair adds +1 to the preferred word and -1
            to the dispreferred word; the net counts below are the entire reward signal r(w).
          </p>
          <div className="overflow-x-auto rounded-xl border border-[#1e293b]">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#1e293b] text-left">
                  <th className="px-3 py-2 font-semibold text-[#94a3b8]">Preferred</th>
                  <th className="px-3 py-2 font-semibold text-[#94a3b8]">Dispreferred</th>
                  <th className="px-3 py-2 font-semibold text-[#94a3b8]">Why</th>
                </tr>
              </thead>
              <tbody>
                {PREF_PAIRS.map((p, i) => (
                  <tr key={p.id} style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}>
                    <td className="px-3 py-2 font-mono text-[var(--color-success)]">{p.winner}</td>
                    <td className="px-3 py-2 font-mono text-[#ef4444]">{p.loser}</td>
                    <td className="px-3 py-2 text-[#94a3b8]">{p.rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap gap-2" aria-label="Net reward per word, counted from the pairs">
            {rewardedTokens.map((t) => (
              <span
                key={t.token}
                className="px-2.5 py-1 rounded-full border border-[#1e293b] font-mono text-[11px]"
                style={{ color: t.reward > 0 ? "var(--color-success)" : "#ef4444" }}
              >
                {t.token} {t.reward > 0 ? `+${t.reward}` : t.reward}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
