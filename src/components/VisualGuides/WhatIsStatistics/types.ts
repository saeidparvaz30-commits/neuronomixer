export type Scenario = "product_launch" | "loan_default" | "clinical_trial";
export type FramingType = "descriptive" | "inferential" | "predictive";

export interface ProductLaunchRow {
  userId: string;
  device: string;
  trafficSource: string;
  tenure: number;
  adopted: string;
}

export interface LoanDefaultRow {
  groupId: string;
  income: string;
  defaulted: string;
}

export interface ClinicalTrialRow {
  group: string;
  scoreBefore: number;
  scoreAfter: number;
}

export interface ScenarioInfo {
  id: Scenario;
  title: string;
  context: string;
  decisionQuestion: string;
  options: string[];
  correctAnswer: string;
  notQuiteHint: string;
  revealText: string;
  conceptTerms: { term: string; definition: string }[];
  framings: Record<FramingType, string>;
}

export interface WhatIsStatisticsState {
  currentScenario: Scenario;
  userAnswers: Record<Scenario, string | null>;
  revealed: Record<Scenario, boolean>;
  framing: FramingType;
}

export const initialState: WhatIsStatisticsState = {
  currentScenario: "product_launch",
  userAnswers: { product_launch: null, loan_default: null, clinical_trial: null },
  revealed: { product_launch: false, loan_default: false, clinical_trial: false },
  framing: "descriptive",
};
