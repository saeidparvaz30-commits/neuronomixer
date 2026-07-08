"use client";

import React, { useEffect, useRef } from "react";
import DistributionCard from "./DistributionCard";

interface UseCaseExplainerProps {
  onCardViewed: (index: number) => void;
}

// ── SVG icons (lucide-like, no external dep) ──────────────────────────────────

function TIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M12 6v12" />
    </svg>
  );
}

function ChiIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l6 6m0 0l6-6M9 9v12" />
      <path d="M21 9l-6 6m6 0l-6-6" />
    </svg>
  );
}

function FIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x={3} y={3} width={7} height={7} rx={1} />
      <rect x={14} y={3} width={7} height={7} rx={1} />
      <rect x={3} y={14} width={7} height={7} rx={1} />
      <path d="M14 17.5h7M17.5 14v7" />
    </svg>
  );
}

// ── Card data ─────────────────────────────────────────────────────────────────

const CARDS = [
  {
    icon: <TIcon />,
    title: "When to Use t: Small Samples, Unknown σ",
    description:
      "The t-distribution is your go-to whenever the population standard deviation is unknown and you're working with small samples.",
    bullets: [
      "One-sample t-test: Is the sample mean different from a hypothesised value?",
      "Two-sample t-test: Do two groups have different means?",
      "Confidence interval for mean when population SD is unknown",
      "Paired t-test: Before-and-after measurements on the same subjects",
    ],
    example:
      "Sample of 15 students (mean GPA 3.2, s = 0.4). Test if GPA differs from 3.0. Use t with df = 14.",
    insightBadge: "t → Normal as n grows",
    accentColor: "#3bb4a4",
  },
  {
    icon: <ChiIcon />,
    title: "When to Use Chi-Square: Categorical Data",
    description:
      "Chi-square tests work on counts and frequencies. The distribution itself is always positive and right-skewed.",
    bullets: [
      "Goodness-of-fit: Does the data match an expected distribution?",
      "Test of independence: Are two categorical variables related?",
      "Test of homogeneity: Do multiple groups share the same distribution?",
      "Variance test: Is a sample variance equal to a hypothesised value?",
    ],
    example:
      "Roll a die 300 times. Test if it is fair. Use chi-square goodness-of-fit with df = 5.",
    insightBadge: "Always non-negative, right-skewed",
    accentColor: "#d4af37",
  },
  {
    icon: <FIcon />,
    title: "When to Use F: Variances & ANOVA",
    description:
      "The F-distribution is defined as the ratio of two scaled chi-square variables. It arises whenever you compare variances.",
    bullets: [
      "Variance-ratio and Levene's tests: Are group variances equal? (Bartlett's test answers the same question but its statistic follows chi-square, not F)",
      "One-way ANOVA: Do multiple group means differ significantly?",
      "Regression F-statistic: Is the overall regression model significant?",
      "Two-way ANOVA: Main effects and interaction effects",
    ],
    example:
      "Three production lines, 30 samples each. Test if they have equal output variances using Levene's test, an F-test with df1 = 2, df2 = 87.",
    insightBadge: "Ratio of two chi-squares",
    accentColor: "#93c5fd",
  },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function UseCaseExplainer({ onCardViewed }: UseCaseExplainerProps) {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const viewedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    CARDS.forEach((_, i) => {
      const el = cardRefs.current[i];
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !viewedRef.current.has(i)) {
            viewedRef.current.add(i);
            onCardViewed(i);
          }
        },
        { threshold: 0.5 }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((obs) => obs.disconnect());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section>
      <div className="mb-5">
        <h2 className="text-[17px] font-bold text-white">
          Which Distribution Should You Use?
        </h2>
        <p className="text-[12px] text-[#94a3b8] mt-1">
          Three key sampling distributions, each with a distinct use case.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CARDS.map((card, i) => (
          <div
            key={card.title}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
          >
            <DistributionCard
              icon={card.icon}
              title={card.title}
              description={card.description}
              bullets={card.bullets}
              example={card.example}
              insightBadge={card.insightBadge}
              accentColor={card.accentColor}
              index={i}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
