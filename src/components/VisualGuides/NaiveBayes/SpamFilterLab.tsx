"use client";

import React from "react";
import {
  VOCAB,
  CORPUS,
  CorpusPriors,
  PosteriorResult,
} from "./nbMath";

interface Props {
  priors: CorpusPriors;
  likeSpam: number[];
  likeHam: number[];
  /** Rounded corpus estimates, shown as the reference under each slider. */
  corpusLikeSpam: number[];
  corpusLikeHam: number[];
  present: boolean[];
  posterior: PosteriorResult;
  onLikelihoodChange: (cls: "spam" | "ham", idx: number, value: number) => void;
  onToggleWord: (idx: number) => void;
  onResetLikelihoods: () => void;
}

/** Cap for the contribution mini-bars: log ratios beyond this render full width. */
const BAR_CAP = 1.6;

export default function SpamFilterLab({
  priors,
  likeSpam,
  likeHam,
  corpusLikeSpam,
  corpusLikeHam,
  present,
  posterior,
  onLikelihoodChange,
  onToggleWord,
  onResetLikelihoods,
}: Props) {
  const verdictSpam = posterior.pSpam >= 0.5;
  const presentWords = VOCAB.filter((_, i) => present[i]);

  const contributionRows = [
    {
      key: "prior",
      label: "prior",
      tag: `${priors.spamCount}/${priors.total} spam`,
      logRatio: posterior.priorLog,
    },
    ...posterior.contributions.map((c) => ({
      key: c.word,
      label: c.word,
      tag: c.present ? "present" : "absent",
      logRatio: c.logRatio,
    })),
  ];

  return (
    <div>
      {/* Corpus */}
      <p className="text-[12px] font-semibold text-white mb-2">
        The training corpus (all ten messages)
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        {CORPUS.map((m) => (
          <div
            key={m.id}
            className="flex items-start gap-2 rounded-lg border border-[#1e293b] bg-[#162032] px-3 py-2"
          >
            <span
              className={`shrink-0 mt-0.5 text-[9px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 border ${
                m.label === "spam"
                  ? "text-[var(--color-warning)] border-[var(--color-warning)]"
                  : "text-[#3bb4a4] border-[#3bb4a4]"
              }`}
            >
              {m.label}
            </span>
            <div className="min-w-0">
              <p className="text-[12px] text-[#f1f5f9] leading-snug">{m.text}</p>
              <p className="text-[10px] text-[#475569] font-mono mt-0.5">
                vocab hits: {m.words.join(", ")}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[12px] text-[#94a3b8] mb-6">
        Priors come straight from the labels:{" "}
        <span className="font-mono text-[var(--color-accent)]">
          P(spam) = {priors.spamCount}/{priors.total} = {priors.pSpam.toFixed(2)}
        </span>
        ,{" "}
        <span className="font-mono text-[#3bb4a4]">
          P(ham) = {priors.hamCount}/{priors.total} = {priors.pHam.toFixed(2)}
        </span>
        .
      </p>

      {/* Likelihood sliders */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <p className="text-[12px] font-semibold text-white">
          Per-word likelihoods (start at the corpus estimates, Laplace smoothed)
        </p>
        <button
          onClick={onResetLikelihoods}
          className="text-[11px] px-2.5 py-1 rounded-lg border border-[#334155] text-[#94a3b8] hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
        >
          Reset to corpus estimates
        </button>
      </div>
      <div className="rounded-xl border border-[#1e293b] overflow-hidden mb-6">
        <div className="grid grid-cols-[72px_1fr_1fr] gap-x-4 px-3 py-2 bg-[#1e293b] text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
          <span>word</span>
          <span>P(word | spam)</span>
          <span>P(word | ham)</span>
        </div>
        {VOCAB.map((word, i) => (
          <div
            key={word}
            className={`grid grid-cols-[72px_1fr_1fr] gap-x-4 items-center px-3 py-2 ${
              i % 2 === 0 ? "bg-[#0f172a]" : "bg-[#162032]"
            }`}
          >
            <span className="text-[12px] font-mono text-[#f1f5f9]">{word}</span>
            {(["spam", "ham"] as const).map((cls) => {
              const value = cls === "spam" ? likeSpam[i] : likeHam[i];
              const ref = cls === "spam" ? corpusLikeSpam[i] : corpusLikeHam[i];
              return (
                <div key={cls} className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0.01}
                    max={0.99}
                    step={0.01}
                    value={value}
                    aria-label={`Likelihood of the word ${word} in ${cls} messages`}
                    onChange={(e) => onLikelihoodChange(cls, i, Number(e.target.value))}
                    className="w-full accent-[var(--color-accent)]"
                  />
                  <span className="w-10 shrink-0 text-right text-[11px] font-mono text-[#f1f5f9]">
                    {value.toFixed(2)}
                  </span>
                  <span className="w-14 shrink-0 text-[9px] font-mono text-[#475569]">
                    corp {ref.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Composer + posterior */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[12px] font-semibold text-white mb-2">
            Compose the incoming message
          </p>
          <p className="text-[11px] text-[#94a3b8] mb-3">
            Toggle which vocabulary words the new message contains. Absent
            words are evidence too: each contributes its 1 minus likelihood
            factor.
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {VOCAB.map((word, i) => (
              <button
                key={word}
                aria-pressed={present[i]}
                onClick={() => onToggleWord(i)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-mono border transition-colors ${
                  present[i]
                    ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[#d4af37]/5"
                    : "border-[#334155] text-[#475569] hover:text-[#94a3b8]"
                }`}
              >
                {present[i] ? "✓ " : "+ "}
                {word}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[#94a3b8] font-mono">
            contains: {presentWords.length > 0 ? presentWords.join(", ") : "(no vocab words)"}
          </p>
        </div>

        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[12px] font-semibold text-white mb-3">
            Posterior via Bayes rule
          </p>
          {(
            [
              { label: "spam", p: posterior.pSpam, color: "var(--color-warning)" },
              { label: "ham", p: posterior.pHam, color: "#3bb4a4" },
            ] as const
          ).map((row) => (
            <div key={row.label} className="mb-2.5">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[11px] font-mono text-[#94a3b8]">
                  P({row.label} | message)
                </span>
                <span className="text-[13px] font-mono font-bold text-[#f1f5f9]">
                  {(100 * row.p).toFixed(1)}%
                </span>
              </div>
              <div className="h-3 rounded-full bg-[#1e293b] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(100 * row.p).toFixed(1)}%`,
                    background: row.color,
                  }}
                />
              </div>
            </div>
          ))}
          <p className="text-[12px] text-[#94a3b8] mt-3">
            Verdict:{" "}
            <span
              className={`font-bold ${
                verdictSpam ? "text-[var(--color-warning)]" : "text-[#3bb4a4]"
              }`}
            >
              {verdictSpam ? "SPAM" : "HAM"}
            </span>{" "}
            <span className="font-mono">
              (log odds {posterior.logOdds >= 0 ? "+" : ""}
              {posterior.logOdds.toFixed(2)})
            </span>
          </p>
        </div>
      </div>

      {/* Contribution table */}
      <p className="text-[12px] font-semibold text-white mb-2">
        Where the verdict comes from: one additive term per word
      </p>
      <p className="text-[11px] text-[#94a3b8] mb-3">
        Log odds = prior term + sum of per-word log likelihood ratios.
        Positive terms push toward spam, negative toward ham. This additivity
        is the independence assumption at work.
      </p>
      <div className="rounded-xl border border-[#1e293b] overflow-x-auto">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-[#1e293b] text-left text-[#94a3b8]">
              <th className="px-3 py-2 font-semibold">term</th>
              <th className="px-3 py-2 font-semibold">evidence</th>
              <th className="px-3 py-2 font-semibold text-right">log ratio</th>
              <th className="px-3 py-2 font-semibold w-[40%]">push</th>
            </tr>
          </thead>
          <tbody>
            {contributionRows.map((row, i) => {
              const widthPct = Math.min(100, (Math.abs(row.logRatio) / BAR_CAP) * 100);
              const towardSpam = row.logRatio >= 0;
              return (
                <tr key={row.key} className={i % 2 === 0 ? "bg-[#0f172a]" : "bg-[#162032]"}>
                  <td className="px-3 py-1.5 font-mono text-[#f1f5f9]">{row.label}</td>
                  <td className="px-3 py-1.5 text-[#94a3b8]">{row.tag}</td>
                  <td
                    className={`px-3 py-1.5 font-mono text-right ${
                      towardSpam ? "text-[var(--color-warning)]" : "text-[#3bb4a4]"
                    }`}
                  >
                    {towardSpam ? "+" : ""}
                    {row.logRatio.toFixed(3)}
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center h-2.5">
                      <div className="w-1/2 flex justify-end">
                        {!towardSpam && (
                          <div
                            className="h-2 rounded-l-full"
                            style={{
                              width: `${widthPct.toFixed(1)}%`,
                              background: "#3bb4a4",
                            }}
                          />
                        )}
                      </div>
                      <div className="w-px h-full bg-[#334155] shrink-0" />
                      <div className="w-1/2">
                        {towardSpam && (
                          <div
                            className="h-2 rounded-r-full"
                            style={{
                              width: `${widthPct.toFixed(1)}%`,
                              background: "var(--color-warning)",
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
            <tr className="bg-[#1e293b]">
              <td className="px-3 py-1.5 font-mono font-bold text-[#f1f5f9]">total</td>
              <td className="px-3 py-1.5 text-[#94a3b8]">sum of terms</td>
              <td className="px-3 py-1.5 font-mono font-bold text-right text-[var(--color-accent)]">
                {posterior.logOdds >= 0 ? "+" : ""}
                {posterior.logOdds.toFixed(3)}
              </td>
              <td className="px-3 py-1.5 font-mono text-[#94a3b8]">
                sigmoid → P(spam) = {(100 * posterior.pSpam).toFixed(1)}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
