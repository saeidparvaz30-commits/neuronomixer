// Types for Bayes Theorem Visual Guide

export type ScenarioType = "medical" | "spam" | "fairness";

export interface BayesState {
  scenario: ScenarioType;
  intuition: number; // 0-100
  intuitionApplied: boolean; // user clicked "Apply Guess"
  actualsRevealed: boolean; // user clicked "Show Actuals"
  baseRate: number; // 0.001 to 0.1
  sensitivity: number; // 0.5 to 1.0
  specificity: number; // 0.5 to 1.0
  posterior: number; // computed
  slidersTouched: { baseRate: boolean; sensitivity: boolean; specificity: boolean };
  animationStep: 1 | 2 | 3;
  stepsVisited: { 1: boolean; 2: boolean; 3: boolean };
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
  guessQuestion: string;
  guessSubtext: string;
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
    guessQuestion: "If the test is positive, what's the probability the person actually has the disease?",
    guessSubtext: "P(Has Disease | Test Positive)",
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
    guessQuestion: "If an email is flagged, what's the probability it's actually spam?",
    guessSubtext: "P(Is Spam | Flagged)",
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
    guessQuestion: "If you observe 7+ heads in 10 flips, what's the probability the coin is biased?",
    guessSubtext: "P(Biased | 7+ Heads)",
  },
};

export const initialBayesState: BayesState = {
  scenario: "medical",
  intuition: 50,
  intuitionApplied: false,
  actualsRevealed: false,
  baseRate: SCENARIO_CONFIGS.medical.baseRate,
  sensitivity: SCENARIO_CONFIGS.medical.sensitivity,
  specificity: SCENARIO_CONFIGS.medical.specificity,
  posterior: computePosterior(
    SCENARIO_CONFIGS.medical.baseRate,
    SCENARIO_CONFIGS.medical.sensitivity,
    SCENARIO_CONFIGS.medical.specificity
  ),
  slidersTouched: { baseRate: false, sensitivity: false, specificity: false },
  animationStep: 1,
  stepsVisited: { 1: false, 2: false, 3: false },
};
