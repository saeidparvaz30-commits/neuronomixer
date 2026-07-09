/**
 * Types, authored transcripts, and the two graders (code-based outcome checks
 * and the rubric judge). No React imports: a verifier can recompute every
 * verdict shown on the page by executing these functions with node/tsx.
 */

export type StepKind = "thought" | "tool_call" | "observation" | "answer";

export interface TranscriptStep {
  kind: StepKind;
  text: string;
  toolName?: string;
  toolInput?: string;
}

export type TranscriptId = "careful" | "guesser" | "typo";

export interface Transcript {
  id: TranscriptId;
  label: string;
  tagline: string;
  lesson: string;
  steps: readonly TranscriptStep[];
}

/** Category series color for Applied AI (token table pink). */
export const ACCENT_PINK = "#ec4899";

export const STEP_STYLE: Record<StepKind, { label: string; color: string }> = {
  thought: { label: "Thought", color: "#93c5fd" },
  tool_call: { label: "Tool call", color: ACCENT_PINK },
  observation: { label: "Observation", color: "#3bb4a4" },
  answer: { label: "Answer", color: "var(--color-accent)" },
};

/* ---------------------------------------------------------------------------
 * The task and its ground truth. Every "correct answer" comparison on the page
 * is recomputed from this data, never hard-coded.
 * ------------------------------------------------------------------------- */

export interface ReturnedItem {
  item: string;
  amount: number;
  opened: boolean;
}

export const RETURNED_ITEMS: readonly ReturnedItem[] = [
  { item: "Headphones", amount: 80, opened: true },
  { item: "USB cable", amount: 20, opened: false },
];

/** Opened items refund 90% of the amount; unopened refund in full. */
export const OPENED_REFUND_RATE = 0.9;

export const TASK_PROMPT =
  "Customer Chen asks: how much refund am I owed for my returned items this month?";

export const TOOLBOX = [
  "search_orders(customer)",
  "get_refund_policy()",
  "calculator(expression)",
] as const;

/** Ground truth, recomputed from the order data and the policy rate. */
export function expectedRefund(
  items: readonly ReturnedItem[] = RETURNED_ITEMS,
  openedRate: number = OPENED_REFUND_RATE
): number {
  return items.reduce(
    (sum, it) => sum + (it.opened ? it.amount * openedRate : it.amount),
    0
  );
}

const SEARCH_OBS =
  "Two returned items this month: Headphones, $80 (opened). USB cable, $20 (unopened).";

const POLICY_OBS =
  "Refund policy: unopened items refund the full amount. Opened items refund 90% of the amount (multiply by 0.9).";

/* ---------------------------------------------------------------------------
 * Three authored transcripts of the same agent attempting the same task.
 * ------------------------------------------------------------------------- */

export const TRANSCRIPTS: readonly Transcript[] = [
  {
    id: "careful",
    label: "A: The careful run",
    tagline: "Looks everything up, verifies, answers correctly.",
    lesson:
      "Both graders pass. When the outcome check and the rubric judge agree, you can trust the pass: right answer, reached the right way.",
    steps: [
      {
        kind: "thought",
        text: "Chen wants this month's refund total. First I need the returned orders.",
      },
      {
        kind: "tool_call",
        text: "Look up Chen's returns.",
        toolName: "search_orders",
        toolInput: 'customer="Chen"',
      },
      { kind: "observation", text: SEARCH_OBS },
      {
        kind: "thought",
        text: "One item is opened. The refund rate for opened items depends on store policy, so I will fetch it instead of assuming.",
      },
      {
        kind: "tool_call",
        text: "Fetch the refund policy.",
        toolName: "get_refund_policy",
        toolInput: "",
      },
      { kind: "observation", text: POLICY_OBS },
      {
        kind: "tool_call",
        text: "Compute the total refund.",
        toolName: "calculator",
        toolInput: "80 * 0.9 + 20",
      },
      { kind: "observation", text: "92" },
      {
        kind: "answer",
        text: "Chen is owed a total refund of $92 for this month's returns.",
      },
    ],
  },
  {
    id: "guesser",
    label: "B: The lucky guesser",
    tagline: "Right answer, but it guessed the policy from memory.",
    lesson:
      "The outcome grader passes, the rubric judge fails it. The 0.9 rate never came from any observation: the agent guessed the policy and happened to be right. Anthropic's eval guidance is blunt about this pattern: read the transcript, because a correct answer can hide a broken process. This is exactly the kind of run to turn into a new eval task.",
    steps: [
      {
        kind: "thought",
        text: "Chen wants a refund total. Let me pull the returns.",
      },
      {
        kind: "tool_call",
        text: "Look up Chen's returns.",
        toolName: "search_orders",
        toolInput: 'customer="Chen"',
      },
      { kind: "observation", text: SEARCH_OBS },
      {
        kind: "thought",
        text: "Opened items are usually refunded at ninety percent, I remember that from other stores. No need to check the policy tool.",
      },
      {
        kind: "tool_call",
        text: "Compute the total refund.",
        toolName: "calculator",
        toolInput: "80 * 0.9 + 20",
      },
      { kind: "observation", text: "92" },
      { kind: "answer", text: "Chen is owed $92 in refunds this month." },
    ],
  },
  {
    id: "typo",
    label: "C: The typo",
    tagline: "Great process, one miskeyed digit, wrong answer.",
    lesson:
      "The outcome grader fails and tells you nothing else. The rubric judge scores 3 of 4, and the one failing criterion points at the exact broken step: a calculator input that appears in no observation. Process evals localize failures; outcome evals only detect them.",
    steps: [
      {
        kind: "thought",
        text: "Chen wants this month's refund total. First I need the returned orders.",
      },
      {
        kind: "tool_call",
        text: "Look up Chen's returns.",
        toolName: "search_orders",
        toolInput: 'customer="Chen"',
      },
      { kind: "observation", text: SEARCH_OBS },
      {
        kind: "thought",
        text: "One item is opened, so I need the official refund rate before computing.",
      },
      {
        kind: "tool_call",
        text: "Fetch the refund policy.",
        toolName: "get_refund_policy",
        toolInput: "",
      },
      { kind: "observation", text: POLICY_OBS },
      {
        kind: "tool_call",
        text: "Compute the total refund.",
        toolName: "calculator",
        toolInput: "80 * 0.9 + 2",
      },
      { kind: "observation", text: "74" },
      {
        kind: "answer",
        text: "Chen is owed a total refund of $74 for this month's returns.",
      },
    ],
  },
];

export const ALL_TRANSCRIPT_IDS: readonly TranscriptId[] = [
  "careful",
  "guesser",
  "typo",
];

/* ---------------------------------------------------------------------------
 * Graders
 * ------------------------------------------------------------------------- */

export interface CheckResult {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
}

/** Maximum steps allowed by the outcome grader's efficiency budget. */
export const MAX_STEPS = 10;

/** Rubric verdict passes when at least this many of the 4 criteria hold. */
export const RUBRIC_PASS_THRESHOLD = 3;

export function extractNumbers(text: string): number[] {
  const matches = text.match(/\d+(?:\.\d+)?/g);
  return matches ? matches.map(Number) : [];
}

function finalAnswerStep(t: Transcript): TranscriptStep | undefined {
  return [...t.steps].reverse().find((s) => s.kind === "answer");
}

function observationNumbers(steps: readonly TranscriptStep[]): number[] {
  return steps
    .filter((s) => s.kind === "observation")
    .flatMap((s) => extractNumbers(s.text));
}

/**
 * Code-based outcome checks: cheap, objective, and blind to HOW the agent
 * got there. They only look at the final state and hard facts of the run.
 */
export function runOutcomeChecks(t: Transcript): CheckResult[] {
  const truth = expectedRefund();
  const answer = finalAnswerStep(t);
  const answerNumbers = answer ? extractNumbers(answer.text) : [];
  const said = answerNumbers.length
    ? answerNumbers[answerNumbers.length - 1]
    : null;

  const searchCalled = t.steps.some(
    (s) => s.kind === "tool_call" && s.toolName === "search_orders"
  );

  return [
    {
      id: "final-answer",
      label: "Final answer matches ground truth",
      pass: said !== null && said === truth,
      detail:
        said === null
          ? `No numeric answer found. Ground truth recomputed from the order data is $${truth}.`
          : said === truth
            ? `Answer says $${said}; ground truth recomputed from the order data is $${truth}.`
            : `Answer says $${said}, but ground truth recomputed from the order data is $${truth}.`,
    },
    {
      id: "used-search",
      label: "Called search_orders at least once",
      pass: searchCalled,
      detail: searchCalled
        ? "The run fetched real order data instead of inventing it."
        : "search_orders never appears in the transcript.",
    },
    {
      id: "step-budget",
      label: `Stayed within the ${MAX_STEPS}-step budget`,
      pass: t.steps.length <= MAX_STEPS,
      detail: `Used ${t.steps.length} of ${MAX_STEPS} allowed steps.`,
    },
  ];
}

/**
 * The rubric judge: process criteria applied to the whole trajectory.
 * In production this judge is an LLM reading the transcript against the
 * rubric; here each criterion is implemented as a deterministic check so
 * every verdict on this page is reproducible.
 */
export function runRubricChecks(t: Transcript): CheckResult[] {
  const results: CheckResult[] = [];

  // 1. Consulted the policy instead of assuming it.
  const policyCalled = t.steps.some(
    (s) => s.kind === "tool_call" && s.toolName === "get_refund_policy"
  );
  results.push({
    id: "policy-consulted",
    label: "Fetched the refund policy before computing",
    pass: policyCalled,
    detail: policyCalled
      ? "get_refund_policy was called, so the refund rate is sourced, not assumed."
      : "get_refund_policy never appears in the transcript; the refund rate was assumed from memory.",
  });

  // 2. Every number in the final answer appears in some observation.
  const answer = finalAnswerStep(t);
  const obsNums = observationNumbers(t.steps);
  const answerNums = answer ? extractNumbers(answer.text) : [];
  const ungroundedAnswer = answerNums.filter((n) => !obsNums.includes(n));
  results.push({
    id: "grounded-answer",
    label: "Answer numbers appear in observations",
    pass: answerNums.length > 0 && ungroundedAnswer.length === 0,
    detail:
      answerNums.length === 0
        ? "The answer contains no number to verify."
        : ungroundedAnswer.length === 0
          ? `Every answer figure (${answerNums.join(", ")}) is present in a tool observation.`
          : `These answer figures appear in no observation: ${ungroundedAnswer.join(", ")}.`,
  });

  // 3. Every number fed to the calculator appeared in an EARLIER observation.
  const ungroundedInputs: number[] = [];
  const seen: number[] = [];
  for (const s of t.steps) {
    if (s.kind === "observation") {
      seen.push(...extractNumbers(s.text));
    }
    if (s.kind === "tool_call" && s.toolName === "calculator" && s.toolInput) {
      for (const n of extractNumbers(s.toolInput)) {
        if (!seen.includes(n) && !ungroundedInputs.includes(n)) {
          ungroundedInputs.push(n);
        }
      }
    }
  }
  results.push({
    id: "grounded-inputs",
    label: "Calculator inputs grounded in prior observations",
    pass: ungroundedInputs.length === 0,
    detail:
      ungroundedInputs.length === 0
        ? "Every value fed to the calculator was seen in an earlier observation."
        : `Fed to the calculator without appearing in any earlier observation: ${ungroundedInputs.join(", ")}.`,
  });

  // 4. No repeated identical tool calls.
  const calls = t.steps
    .filter((s) => s.kind === "tool_call")
    .map((s) => `${s.toolName}(${s.toolInput ?? ""})`);
  const duplicates = calls.filter((c, i) => calls.indexOf(c) !== i);
  results.push({
    id: "no-redundant-calls",
    label: "No repeated identical tool calls",
    pass: duplicates.length === 0,
    detail:
      duplicates.length === 0
        ? `All ${calls.length} tool calls are distinct.`
        : `Repeated calls: ${[...new Set(duplicates)].join("; ")}.`,
  });

  return results;
}

export function outcomePass(checks: readonly CheckResult[]): boolean {
  return checks.every((c) => c.pass);
}

export interface RubricVerdict {
  passed: number;
  total: number;
  pass: boolean;
}

export function rubricVerdict(checks: readonly CheckResult[]): RubricVerdict {
  const passed = checks.filter((c) => c.pass).length;
  return { passed, total: checks.length, pass: passed >= RUBRIC_PASS_THRESHOLD };
}

/** Number of transcripts where the two graders reach opposite verdicts. */
export function countDisagreements(
  transcripts: readonly Transcript[] = TRANSCRIPTS
): number {
  return transcripts.filter(
    (t) => outcomePass(runOutcomeChecks(t)) !== rubricVerdict(runRubricChecks(t)).pass
  ).length;
}
