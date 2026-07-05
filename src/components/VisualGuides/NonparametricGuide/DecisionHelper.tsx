"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DecisionAnswer } from "./types";

interface Props {
  onUsed: () => void;
}

interface Question {
  id: keyof DecisionAnswer;
  text: string;
  options: { value: string; label: string }[];
}

const QUESTIONS: Question[] = [
  {
    id: "numGroups",
    text: "How many groups are you comparing?",
    options: [
      { value: "one", label: "One group" },
      { value: "two", label: "Two groups" },
      { value: "many", label: "Three or more groups" },
    ],
  },
  {
    id: "design",
    text: "What is your study design?",
    options: [
      { value: "independent", label: "Independent (different subjects)" },
      { value: "paired", label: "Paired (same subjects, before/after)" },
    ],
  },
  {
    id: "variableType",
    text: "What type of outcome variable do you have?",
    options: [
      { value: "continuous", label: "Continuous (e.g. age, weight, time)" },
      { value: "ordinal", label: "Ordinal (e.g. Likert scale 1–5)" },
      { value: "binary", label: "Binary (e.g. yes/no)" },
    ],
  },
  {
    id: "sampleSize",
    text: "How large is your sample?",
    options: [
      { value: "small", label: "Small (n < 20)" },
      { value: "medium", label: "Medium (20 ≤ n ≤ 50)" },
      { value: "large", label: "Large (n > 50)" },
    ],
  },
  {
    id: "normality",
    text: "Is your data approximately normally distributed?",
    options: [
      { value: "yes", label: "Yes, roughly normal (straight Q-Q plot, r > 0.95)" },
      { value: "no", label: "No — significant departure from normality" },
      { value: "unsure", label: "Unsure / not checked" },
    ],
  },
];

interface Recommendation {
  test: string;
  color: "gold" | "teal";
  reason: string;
  note?: string;
}

function getRecommendation(answers: DecisionAnswer): Recommendation {
  const { numGroups, design, variableType, normality } = answers;

  // Binary outcomes: the right test depends on the design, not just the type
  if (variableType === "binary") {
    if (numGroups === "one") {
      return {
        test: "Exact Binomial Test",
        color: "gold",
        reason:
          "One group with a binary outcome: compare the observed proportion against a hypothesized value with the exact binomial test.",
      };
    }
    if (design === "paired") {
      return {
        test: "McNemar's Test",
        color: "gold",
        reason:
          "Paired binary outcomes (the same subjects measured twice) call for McNemar's test, which compares the discordant pairs.",
        note: "The sign test is the same idea applied to the direction of paired differences.",
      };
    }
    if (numGroups === "many") {
      return {
        test: "Chi-Square Test of Independence",
        color: "gold",
        reason:
          "A binary outcome across three or more independent groups: compare proportions with a chi-square test on the contingency table.",
      };
    }
    return {
      test: "Chi-Square / Fisher's Exact Test",
      color: "gold",
      reason:
        "A binary outcome in two independent groups: compare proportions with a chi-square test, or Fisher's exact test when expected counts are small.",
    };
  }

  // One group (continuous or ordinal): compare against a hypothesized value
  if (numGroups === "one") {
    if (variableType === "continuous" && normality === "yes") {
      return {
        test: "One-Sample t-test (Parametric)",
        color: "teal",
        reason:
          "One group of approximately normal continuous data: test the mean against a hypothesized value with a one-sample t-test.",
      };
    }
    return {
      test: "Wilcoxon Signed-Rank Test (One-Sample)",
      color: "gold",
      reason:
        "One group without a normality guarantee: test the median against a hypothesized value with the one-sample Wilcoxon signed-rank test.",
      note: "The sign test is a simpler alternative that uses only the direction of each difference.",
    };
  }

  if (variableType === "ordinal") {
    if (design === "paired") {
      return {
        test: "Wilcoxon Signed-Rank Test",
        color: "gold",
        reason: "Ordinal paired data → Wilcoxon signed-rank test works on ranks and does not require equal intervals.",
      };
    }
    if (numGroups === "many") {
      return {
        test: "Kruskal-Wallis Test",
        color: "gold",
        reason: "Ordinal data with 3+ groups → Kruskal-Wallis is the nonparametric analog of one-way ANOVA.",
      };
    }
    return {
      test: "Mann-Whitney U Test",
      color: "gold",
      reason: "Ordinal data with two independent groups → Mann-Whitney U compares rank distributions.",
    };
  }

  // Continuous data
  if (normality === "yes") {
    if (numGroups === "many") {
      return {
        test: "One-Way ANOVA (Parametric)",
        color: "teal",
        reason: "Normality is met with 3+ groups → one-way ANOVA is appropriate.",
        note: "Kruskal-Wallis is safer if sample sizes differ greatly between groups.",
      };
    }
    if (design === "paired") {
      return {
        test: "Paired t-test (Parametric)",
        color: "teal",
        reason: "Normality is met with paired design → the paired t-test is appropriate.",
        note: "Wilcoxon signed-rank is a robust alternative with small samples.",
      };
    }
    return {
      test: "Independent t-test (Parametric)",
      color: "teal",
      reason: "Normality is met with two independent groups → the t-test is the standard choice.",
      note: "Mann-Whitney U is preferred if sample sizes are small or unequal.",
    };
  }

  // Non-normal or unsure
  if (numGroups === "many") {
    return {
      test: "Kruskal-Wallis Test",
      color: "gold",
      reason:
        "Non-normal data with 3+ groups → Kruskal-Wallis ranks all observations and is robust to skewness.",
    };
  }
  if (design === "paired") {
    return {
      test: "Wilcoxon Signed-Rank Test",
      color: "gold",
      reason:
        "Non-normal paired data → Wilcoxon signed-rank test uses the magnitude and direction of rank differences.",
    };
  }
  return {
    test: "Mann-Whitney U Test",
    color: "gold",
    reason:
      "Non-normal data with two independent groups → Mann-Whitney U is the go-to nonparametric alternative to the t-test.",
  };
}

export default function DecisionHelper({ onUsed }: Props) {
  const [answers, setAnswers] = useState<DecisionAnswer>({});
  const [usedFired, setUsedFired] = useState(false);

  const currentStep = QUESTIONS.findIndex((q) => answers[q.id] === undefined);
  const isDone = currentStep === -1;

  const handleAnswer = (key: keyof DecisionAnswer, value: string) => {
    const next = { ...answers, [key]: value as never };
    setAnswers(next);
    // Check if done
    const allAnswered = QUESTIONS.every((q) => next[q.id] !== undefined);
    if (allAnswered && !usedFired) {
      setUsedFired(true);
      onUsed();
    }
  };

  const handleReset = () => {
    setAnswers({});
    setUsedFired(false);
  };

  const stepIndex = isDone ? QUESTIONS.length : currentStep;
  const recommendation = isDone ? getRecommendation(answers) : null;

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[13px] font-bold text-white">Test Selection Helper</h3>
          <p className="text-[11px] text-[#94a3b8] mt-0.5">
            Answer 5 questions to find the right test
          </p>
        </div>
        {(stepIndex > 0 || isDone) && (
          <button
            onClick={handleReset}
            className="text-[10px] text-[#475569] hover:text-[#94a3b8] transition-colors border border-[#1e293b] px-2 py-1 rounded-lg"
          >
            Start Over
          </button>
        )}
      </div>

      {/* Progress */}
      <div className="flex items-center gap-1.5 mb-5">
        {QUESTIONS.map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full transition-colors"
            style={{
              background:
                i < stepIndex ? "#d4af37" : i === stepIndex && !isDone ? "#d4af37" : "#1e293b",
              opacity: i === stepIndex && !isDone ? 0.5 : 1,
            }}
          />
        ))}
        <span className="text-[10px] text-[#94a3b8] ml-1 shrink-0">
          {isDone ? "Done" : `Q ${stepIndex + 1}/5`}
        </span>
      </div>

      <AnimatePresence mode="wait">
        {!isDone ? (
          <motion.div
            key={`q-${currentStep}`}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.25 }}
          >
            <p className="text-[13px] font-semibold text-white mb-3">
              {QUESTIONS[currentStep].text}
            </p>
            <div className="space-y-2">
              {QUESTIONS[currentStep].options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleAnswer(QUESTIONS[currentStep].id, opt.value)}
                  className="w-full text-left px-3 py-2.5 rounded-xl border border-[#1e293b] text-[12px] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Answered so far */}
            {stepIndex > 0 && (
              <div className="mt-4 space-y-1">
                {QUESTIONS.slice(0, stepIndex).map((q) => {
                  const val = answers[q.id];
                  const opt = q.options.find((o) => o.value === val);
                  return (
                    <div key={q.id} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#d4af37] flex-shrink-0" />
                      <span className="text-[10px] text-[#94a3b8]">{q.text}</span>
                      <span className="text-[10px] text-white font-semibold ml-auto">{opt?.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {recommendation && (
              <div
                className={`rounded-xl p-4 border ${
                  recommendation.color === "gold"
                    ? "border-[#d4af37]/40 bg-[#d4af37]/8"
                    : "border-[#3bb4a4]/40 bg-[#3bb4a4]/8"
                }`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-1">
                  Recommended Test
                </p>
                <p
                  className={`text-[16px] font-black mb-2 ${
                    recommendation.color === "gold" ? "text-[#d4af37]" : "text-[#3bb4a4]"
                  }`}
                >
                  {recommendation.test}
                </p>
                <p className="text-[11px] text-[#94a3b8] leading-relaxed mb-2">
                  {recommendation.reason}
                </p>
                {recommendation.note && (
                  <p className="text-[10px] text-[#475569] italic">{recommendation.note}</p>
                )}
              </div>
            )}

            {/* Summary of answers */}
            <div className="mt-4 space-y-1">
              {QUESTIONS.map((q) => {
                const val = answers[q.id];
                const opt = q.options.find((o) => o.value === val);
                return (
                  <div key={q.id} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3bb4a4] flex-shrink-0 mt-1.5" />
                    <span className="text-[10px] text-[#94a3b8] flex-1">{q.text}</span>
                    <span className="text-[10px] text-white font-semibold shrink-0">{opt?.label}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
