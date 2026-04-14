// Types for Bayes Theorem Visual Guide

export type ScenarioType = "medical" | "spam" | "fairness";

export interface BayesState {
  scenario: ScenarioType;
  intuition: number; // 0-100
  baseRate: number; // 0.001 to 0.1
  sensitivity: number; // 0.5 to 1.0
  specificity: number; // 0.5 to 1.0
  posterior: number; // computed
  sliderAdjustments: number; // count of any slider change
  animationStep: 1 | 2 | 3;
  animationCompleted: boolean;
}

export interface ScenarioConfig {
  id: ScenarioType;
  label: string;
  description: string;
  baseRate: number;
  sensitivity: number;
  specificity: number;
  conditionName: string;
  testName: string;
  positiveLabel: string;
}

export function computePosterior(
  baseRate: number,
  sensitivity: number,
  specificity: number
): number {
  const tp = baseRate * sensitivity;
  const fp = (1 - baseRate) * (1 - specificity);
  if (tp + fp === 0) return 0;
  return tp / (tp + fp);
}

export const SCENARIO_CONFIGS: Record<ScenarioType, ScenarioConfig> = {
  medical: {
    id: "medical",
    label: "Medical Test",
    description:
      "A rare disease affects 1 in 1000 people. A test is 95% accurate. You test positive.",
    baseRate: 0.001,
    sensitivity: 0.95,
    specificity: 0.95,
    conditionName: "Has Disease",
    testName: "Tests Positive",
    positiveLabel: "POSITIVE",
  },
  spam: {
    id: "spam",
    label: "Email Spam",
    description:
      "5% of emails are spam. A spam filter correctly flags 98% of spam but also flags 3% of legitimate emails. An email is flagged as spam.",
    baseRate: 0.05,
    sensitivity: 0.98,
    specificity: 0.97,
    conditionName: "Is Spam",
    testName: "Flagged as Spam",
    positiveLabel: "FLAGGED",
  },
  fairness: {
    id: "fairness",
    label: "Coin Fairness",
    description:
      "A coin is biased (P(Heads)=0.7) with probability 0.1; fair (P(Heads)=0.5) with probability 0.9. You flip Heads 7 out of 10 times. Is it biased?",
    baseRate: 0.1,
    sensitivity: 0.617,
    specificity: 0.828,
    conditionName: "Biased Coin",
    testName: "7+ Heads in 10 flips",
    positiveLabel: "7 HEADS",
  },
};

export const initialBayesState: BayesState = {
  scenario: "medical",
  intuition: 95,
  baseRate: SCENARIO_CONFIGS.medical.baseRate,
  sensitivity: SCENARIO_CONFIGS.medical.sensitivity,
  specificity: SCENARIO_CONFIGS.medical.specificity,
  posterior: computePosterior(
    SCENARIO_CONFIGS.medical.baseRate,
    SCENARIO_CONFIGS.medical.sensitivity,
    SCENARIO_CONFIGS.medical.specificity
  ),
  sliderAdjustments: 0,
  animationStep: 1,
  animationCompleted: false,
};
