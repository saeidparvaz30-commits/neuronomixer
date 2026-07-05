export type DatasetType = "test_scores" | "monthly_sales" | "life_expectancy" | "traffic";
export type MisleadingId = "truncated_axis" | "cherry_picked" | "dual_axes" | "3d_pie" | "stacked_area";
export type ChartOptionId = "bar" | "line" | "histogram" | "box_plot" | "area" | "scatter" | "grouped_bar" | "stacked_area" | "sorted_bar" | "multi_line";

export interface ChartOption {
  id: ChartOptionId;
  label: string;
  quality: "best" | "good" | "works" | "poor";
  note: string;
}

export interface Dataset {
  id: DatasetType;
  label: string;
  question: string;
  options: ChartOption[];
  bestChartId: ChartOptionId;
  bestExplanation: string;
  whenToUse: string;
}

export interface MisleadingChart {
  id: MisleadingId;
  title: string;
  lie: string;
  deceptiveCaption: string;
  honestCaption: string;
}

export interface VisualizingDataChartsState {
  selectedDataset: DatasetType;
  selectedChartOption: ChartOptionId | null;
  revealedMisleadingCharts: Set<MisleadingId>;
  datasetsCorrected: Set<DatasetType>;
}

export const DATASETS: Dataset[] = [
  {
    id: "test_scores",
    label: "Student Test Scores",
    question: "How do test scores vary across classes?",
    bestChartId: "bar",
    bestExplanation:
      "A bar chart directly compares discrete categories (Class A, B, C) side by side. Each bar's height instantly communicates the score for that class, making comparison effortless.",
    whenToUse: "Use bar charts when comparing values across distinct, unordered categories.",
    options: [
      {
        id: "bar",
        label: "Bar Chart",
        quality: "best",
        note: "Best choice — directly compares discrete categories with clear visual encoding.",
      },
      {
        id: "histogram",
        label: "Histogram",
        quality: "good",
        note: "Shows score distribution but loses the per-class grouping context.",
      },
      {
        id: "box_plot",
        label: "Box Plot",
        quality: "good",
        note: "Shows spread and median per class, but requires understanding quartiles.",
      },
      {
        id: "line",
        label: "Line Chart",
        quality: "poor",
        note: "Poor choice — lines imply continuity. Classes are categories, not a continuous sequence.",
      },
    ],
  },
  {
    id: "monthly_sales",
    label: "Monthly Sales (12 months)",
    question: "Is sales trending up or down?",
    bestChartId: "line",
    bestExplanation:
      "A line chart is ideal for time-series data. The connected line makes the trend direction immediately visible — the upward slope tells the story at a glance.",
    whenToUse: "Use line charts for time series data where the trend between points matters.",
    options: [
      {
        id: "line",
        label: "Line Chart",
        quality: "best",
        note: "Best choice — connected line makes the trend direction immediately visible.",
      },
      {
        id: "area",
        label: "Area Chart",
        quality: "good",
        note: "Equally good — the filled area emphasizes magnitude; trend is still clear.",
      },
      {
        id: "bar",
        label: "Bar Chart",
        quality: "works",
        note: "Works — monthly bars show values but trend is harder to read than a line.",
      },
      {
        id: "scatter",
        label: "Scatter Plot",
        quality: "poor",
        note: "Poor — unconnected dots make the trend much harder to perceive.",
      },
    ],
  },
  {
    id: "life_expectancy",
    label: "Life Expectancy by Country (20 countries)",
    question: "Which countries have the longest life expectancy?",
    bestChartId: "sorted_bar",
    bestExplanation:
      "A bar chart sorted by value makes ranking immediately obvious. The longest bar = highest life expectancy. Sorting is key — unsorted bars force the eye to scan.",
    whenToUse: "Use sorted bar charts to rank items. Sort descending so the winner is immediately visible.",
    options: [
      {
        id: "sorted_bar",
        label: "Bar Chart (sorted)",
        quality: "best",
        note: "Best choice — sorted bars make ranking instantly obvious without any cognitive work.",
      },
      {
        id: "box_plot",
        label: "Box Plot",
        quality: "poor",
        note: "Poor — a box plot shows distribution, not individual country values.",
      },
      {
        id: "histogram",
        label: "Histogram",
        quality: "poor",
        note: "Poor — groups values into bins, hiding which specific country has which value.",
      },
      {
        id: "scatter",
        label: "Scatter Plot",
        quality: "poor",
        note: "Poor — a scatter of 20 dots on a single axis provides no clarity over a sorted bar.",
      },
    ],
  },
  {
    id: "traffic",
    label: "Website Traffic by Page (5 pages, 3 months)",
    question: "How does each page's traffic trend over time?",
    bestChartId: "multi_line",
    bestExplanation:
      "Multiple lines, one per page, lets you compare trends simultaneously. Each line tells one page's story across three months — trends, crossovers, and divergences all become visible.",
    whenToUse: "Use multiple line charts when comparing trends for several series across time.",
    options: [
      {
        id: "multi_line",
        label: "Line Chart (multi-line)",
        quality: "best",
        note: "Best choice — one line per page shows each trend clearly with easy comparison.",
      },
      {
        id: "grouped_bar",
        label: "Grouped Bar Chart",
        quality: "good",
        note: "Good — shows all values but 15 bars get cluttered; trends harder to read.",
      },
      {
        id: "stacked_area",
        label: "Stacked Area Chart",
        quality: "poor",
        note: "Poor — only the bottom series is accurately readable. Others are distorted by the stack.",
      },
      {
        id: "box_plot",
        label: "Box Plot",
        quality: "poor",
        note: "Poor — shows distribution across months but destroys the time-trend information.",
      },
    ],
  },
];

export const MISLEADING_CHARTS: MisleadingChart[] = [
  {
    id: "truncated_axis",
    title: "Truncated Y-Axis",
    lie: "Exaggerates small differences by cutting the axis short. A 0.5% revenue increase looks like a dramatic doubling.",
    deceptiveCaption: "Revenue appears to have nearly doubled year-over-year.",
    honestCaption: "Starting the axis at $0 reveals both bars are nearly identical — just 0.5% growth.",
  },
  {
    id: "cherry_picked",
    title: "Cherry-Picked Time Range",
    lie: "Showing only the recovery period hides the 50% crash that preceded it. The selected window creates a false impression of consistent growth.",
    deceptiveCaption: "Stock up 73%, showing only the second half of the year (from 55 to 95).",
    honestCaption: "Full year view: a 50% crash in H1 (100 to 50) followed by a strong recovery. Net result: still down 5% from the January start of 100.",
  },
  {
    id: "dual_axes",
    title: "Dual Y-Axes",
    lie: "Different scales make unrelated variables appear correlated. Any two datasets with independent trends can be made to look aligned.",
    deceptiveCaption: "COVID cases and temperature appear to rise and fall together.",
    honestCaption: "Separate charts reveal no meaningful alignment — the correlation was manufactured by axis scaling.",
  },
  {
    id: "3d_pie",
    title: "3D Pie Chart",
    lie: "3D perspective distorts how we perceive angles. Front slices look visually larger than they are, biasing the viewer toward the front wedge.",
    deceptiveCaption: "Slice A (30%) appears to dominate despite being the smallest segment.",
    honestCaption: "A flat 2D bar chart shows the true proportions: A=30%, B=35%, C=35%.",
  },
  {
    id: "stacked_area",
    title: "Misleading Stacked Area",
    lie: "Only the bottom series is accurately readable. Every series above it is shifted by the cumulative sum below — making individual trends impossible to compare.",
    deceptiveCaption: "The middle series appears to 'bulge' dramatically, suggesting rapid growth.",
    honestCaption: "Separate small multiples show the middle series is actually flat — the bulge was an artifact of stacking.",
  },
];
