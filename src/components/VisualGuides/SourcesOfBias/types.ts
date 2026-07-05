export type BiasType = "survivorship" | "nonresponse" | "selection" | "measurement" | "confirmation";

export interface CaseStudy {
  id: BiasType;
  title: string;
  biasLabel: string;
  biasColor: string;
  context: string;
  observedHeadline: string;
  falseConclusion: string;
  hiddenExplanation: string;
  lessonText: string;
  conceptTerms: { term: string; definition: string }[];
  options: string[];
  correctAnswer: string;
  notQuiteHint: string;
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: "survivorship",
    title: "WWII Plane Armor",
    biasLabel: "Survivorship Bias",
    biasColor: "#ef4444",
    context:
      "During WWII, engineers analyzed bullet-hole patterns on bombers that returned from missions. The data showed heavy damage on wings and fuselage, light damage on engines. The recommendation: reinforce the most-damaged areas.",
    observedHeadline: "Most damage found on wings and fuselage",
    falseConclusion:
      "Reinforce the wings and fuselage — they take the most damage.",
    hiddenExplanation:
      "The planes with engine damage never came back — they crashed. Engineers were only seeing survivors. The absence of engine damage in the data is the signal: engine hits are fatal. Reinforce the engines, not the wings.",
    lessonText:
      "Survivorship bias occurs when we analyze only survivors and miss the failures. The silent evidence — the planes that didn't return — carries the most important information. Always ask: 'What am I not seeing?'",
    conceptTerms: [
      { term: "survivorship bias", definition: "Focusing only on entities that 'survived' a selection process, while overlooking those that did not." },
    ],
    options: [
      "The sample size is too small to draw conclusions",
      "There is a measurement error in recording bullet hole positions",
      "We only see planes that made it back — the fatal hits are invisible",
    ],
    correctAnswer: "We only see planes that made it back — the fatal hits are invisible",
    notQuiteHint: "Think about what data is missing entirely — not just what might be mismeasured.",
  },
  {
    id: "nonresponse",
    title: "Workplace Satisfaction Survey",
    biasLabel: "Nonresponse Bias",
    biasColor: "#f97316",
    context:
      "A company surveys employee satisfaction. The results come back: 78% of respondents are satisfied. HR declares the workplace healthy and closes the survey.",
    observedHeadline: "78% of survey respondents are satisfied",
    falseConclusion:
      "The workplace is healthy — the vast majority of employees are happy.",
    hiddenExplanation:
      "The survey had only a 15% response rate. When researchers followed up with non-respondents, satisfaction dropped to 35%. The 78% applies only to the 15% who bothered to reply — typically those with milder opinions. Unhappy employees were the most likely to ignore the survey.",
    lessonText:
      "Nonresponse bias occurs when those who don't participate differ systematically from those who do. A low response rate is a red flag, not just a minor nuisance. The 78% is real — it just doesn't represent the full workforce.",
    conceptTerms: [
      { term: "nonresponse bias", definition: "Systematic error from survey non-participants differing from participants in ways relevant to the topic." },
    ],
    options: [
      "Unhappy employees were less likely to respond, skewing the results",
      "The survey questions were phrased in a leading way",
      "78% is too strong a result to doubt without further evidence",
    ],
    correctAnswer: "Unhappy employees were less likely to respond, skewing the results",
    notQuiteHint: "Consider who tends to ignore surveys — and whether that group has something in common.",
  },
  {
    id: "selection",
    title: "Hospital Surgery Rankings",
    biasLabel: "Selection Bias",
    biasColor: "#d4af37",
    context:
      "Two hospitals publish their 5-year survival rates for complex surgeries. Hospital X reports 50% (450 of 900 patients); Hospital Y reports 34% (342 of 1,000). Patients conclude Hospital X is far better.",
    observedHeadline: "Hospital X: 50% survival · Hospital Y: 34% survival",
    falseConclusion:
      "Hospital X is far superior: its survival rate is 16 points higher.",
    hiddenExplanation:
      "Hospital X only accepts low-risk patients for complex procedures. Hospital Y treats all comers, including high-risk cases. Stratify by risk and the gap vanishes: on low-risk patients Hospital Y survives 51% (102/200) versus X's 50% (450/900), and Y additionally carries 800 high-risk patients at 30% survival that X never touches. Y's lower overall number comes entirely from its harder caseload.",
    lessonText:
      "Selection bias in patient assignment makes Hospital X look better. This is also Simpson's Paradox: the group averages are misleading because the groups have different compositions. Case mix adjustment is required before comparing outcomes across hospitals.",
    conceptTerms: [
      { term: "selection bias", definition: "Bias introduced by non-random inclusion of participants, leading to a sample unrepresentative of the target population." },
      { term: "case mix adjustment", definition: "Correcting for differences in patient risk profiles before comparing outcomes across providers." },
    ],
    options: [
      "Hospital X has more experienced surgeons and better equipment",
      "Hospital Y's data covers a different time period",
      "The hospitals treat different patient risk levels, making a direct comparison unfair",
    ],
    correctAnswer: "The hospitals treat different patient risk levels, making a direct comparison unfair",
    notQuiteHint: "Think about who ends up at each hospital — are they equally sick to begin with?",
  },
  {
    id: "measurement",
    title: "Self-Reported Exercise Data",
    biasLabel: "Measurement Bias",
    biasColor: "#3bb4a4",
    context:
      "A health study asks participants to self-report weekly exercise minutes. Results: adults aged 18–30 report 250 min/week; adults aged 50–70 report only 80 min/week. Conclusion: younger adults are far more active.",
    observedHeadline: "18-30 yr: 250 min/wk · 50-70 yr: 80 min/wk (self-reported)",
    falseConclusion:
      "Younger adults exercise three times more than older adults.",
    hiddenExplanation:
      "When the same groups wore accelerometers for a week, the picture changed: 18-30 year-olds actually did 180 min/week (overestimated by 70 min) while 50-70 year-olds did 140 min/week (underestimated by 60 min, partly because they didn't count gardening and walking). The true gap is 40 min, not 170 min.",
    lessonText:
      "How we measure matters as much as what we measure. Self-reported data is systematically distorted by social desirability — people overstate healthy behaviors they think they should be doing. The bias is not random; it skews in a predictable direction based on the question's social valence.",
    conceptTerms: [
      { term: "measurement bias", definition: "Systematic error in how a variable is measured, often due to self-report distortion or instrument calibration issues." },
      { term: "social desirability bias", definition: "The tendency for survey respondents to answer in ways they think will be viewed favorably." },
    ],
    options: [
      "People over-report exercise they feel they should be doing, distorting the numbers",
      "Younger people genuinely exercise more — the data reflects reality",
      "The age groups are too different to compare in one study",
    ],
    correctAnswer: "People over-report exercise they feel they should be doing, distorting the numbers",
    notQuiteHint: "Think about how asking people to self-report a 'healthy' behavior might affect their answers.",
  },
  {
    id: "confirmation",
    title: "Cherry-Picked Stock Picks",
    biasLabel: "Confirmation Bias",
    biasColor: "#a855f7",
    context:
      "A financial advisor shows you a hand-picked list of 5 investments they recommended over the past year. Returns: +12%, +18%, +9%, +15%, +11%. Market average: +7%. Claim: 'My picks beat the market.'",
    observedHeadline: "5 advisor picks: avg +13% (vs market +7%)",
    falseConclusion:
      "This advisor consistently beats the market — worth paying for.",
    hiddenExplanation:
      "Out of 30 total picks the advisor made that year, you were shown only the 5 best. The full list includes 15 losers (avg −4%) and 10 neutral picks (avg +2%). The true average across all 30 picks is roughly +1%, well below the market's +7%. The advisor curated winners to confirm your impression of their skill.",
    lessonText:
      "Confirmation bias shapes both what we look for and what we share. The advisor remembers — and highlights — their winners. You remember the impressive slide deck, not the full track record you never saw. Always ask for the full distribution, not the highlight reel.",
    conceptTerms: [
      { term: "confirmation bias", definition: "The tendency to search for, interpret, and recall information in a way that confirms one's preexisting beliefs." },
      { term: "cherry-picking", definition: "Selectively presenting data that supports a conclusion while ignoring contradictory evidence." },
    ],
    options: [
      "Past returns never predict future performance — the comparison is meaningless",
      "Only the best 5 picks were shown — the full track record is hidden",
      "The market benchmark used is not a fair comparison",
    ],
    correctAnswer: "Only the best 5 picks were shown — the full track record is hidden",
    notQuiteHint: "Focus on what was selected to be shown to you — and what was left out.",
  },
];
