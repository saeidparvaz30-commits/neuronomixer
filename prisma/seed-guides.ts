/**
 * seed-guides.ts — Idempotent seed for the Visual Guides curriculum.
 * Run with: npx prisma db seed
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: ".env" });

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL!,
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

// ── Category data ────────────────────────────────────────────────────────────

const CATEGORIES = [
  { slug: "statistics",       name: "Statistics",       color: "#d4af37", order: 1 },
  { slug: "data-and-analysis",name: "Data & Analysis",  color: "#3b82f6", order: 2 },
  { slug: "machine-learning", name: "Machine Learning", color: "#3bb4a4", order: 3 },
  { slug: "deep-learning",    name: "Deep Learning",    color: "#a855f7", order: 4 },
  { slug: "llms",             name: "LLMs",             color: "#ef4444", order: 5 },
  { slug: "applied-ai",       name: "Applied AI",       color: "#ec4899", order: 6 },
] as const;

// ── Statistics units ─────────────────────────────────────────────────────────

const STATS_UNITS = [
  { slug: "statistical-thinking-data-literacy", name: "Statistical Thinking & Data Literacy",  order: 1 },
  { slug: "mathematical-foundations",           name: "Mathematical Foundations",               order: 2 },
  { slug: "describing-data",                    name: "Describing Data",                        order: 3 },
  { slug: "probability-foundations",            name: "Probability Foundations",                order: 4 },
  { slug: "distributions",                      name: "Distributions",                          order: 5 },
  { slug: "sampling-estimation",                name: "Sampling & Estimation",                  order: 6 },
  { slug: "statistical-inference",              name: "Statistical Inference",                  order: 7 },
  { slug: "comparing-groups",                   name: "Comparing Groups",                       order: 8 },
  { slug: "association-dependence",             name: "Association & Dependence",               order: 9 },
  { slug: "regression-foundations",             name: "Regression Foundations",                 order: 10 },
  { slug: "generalized-models",                 name: "Generalized Models",                     order: 11 },
  { slug: "experimental-design",                name: "Experimental Design & Causal Thinking",  order: 12 },
  { slug: "time-series-forecasting",            name: "Time Series & Forecasting",              order: 13 },
  { slug: "multivariate-thinking",              name: "Multivariate Thinking",                  order: 14 },
  { slug: "resampling-modern-methods",          name: "Resampling & Modern Methods",            order: 15 },
] as const;

// ── Guide definitions ────────────────────────────────────────────────────────

type GuideDef = {
  slug: string;
  title: string;
  description: string;
  interactiveType: string;
  audience: string;
  order: number;
  implemented: boolean;
  categorySlug: string;
  unitSlug?: string;
};

const GUIDES: GuideDef[] = [
  // ── Statistics ──────────────────────────────────────────────────────────

  // Unit 1: Statistical Thinking & Data Literacy
  {
    slug: "what-is-statistics",
    title: "What Is Statistics? Why It Matters",
    description: "An animated journey through the core purpose of statistics — from raw data to decisions — with real-world examples.",
    interactiveType: "Visual Essay",
    audience: "Everyone",
    order: 1,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "statistical-thinking-data-literacy",
  },
  {
    slug: "types-of-data-measurement-scales",
    title: "Types of Data & Measurement Scales",
    description: "Sort data types into the correct measurement scale buckets and see how scale determines which statistics are valid.",
    interactiveType: "Interactive Sorter",
    audience: "Beginners",
    order: 2,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "statistical-thinking-data-literacy",
  },
  {
    slug: "sources-of-bias",
    title: "Sources of Bias: Selection, Survivorship & Beyond",
    description: "Explore a gallery of real-world bias examples — identify the flaw, understand the consequence, and spot it in new scenarios.",
    interactiveType: "Bias Detective Gallery",
    audience: "Everyone",
    order: 3,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "statistical-thinking-data-literacy",
  },

  // Unit 2: Mathematical Foundations
  {
    slug: "math-for-statistics",
    title: "Math for Statistics: The Visual Toolkit",
    description: "Summation notation, logarithms, and expected value explained through interactive visual examples — no calculus required.",
    interactiveType: "Concept Explorer",
    audience: "Students",
    order: 4,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "mathematical-foundations",
  },

  // Unit 3: Describing Data
  {
    slug: "descriptive-statistics",
    title: "Descriptive Statistics: Center, Spread & Shape",
    description: "Drag data points around a canvas and watch mean, median, mode, variance, and standard deviation update instantly.",
    interactiveType: "Parameter Playground",
    audience: "Students",
    order: 5,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "describing-data",
  },
  {
    slug: "percentiles-quartiles-box-plots",
    title: "Percentiles, Quartiles & Box Plots",
    description: "Build box plots by hand from raw data. Drag the IQR fence to see how outlier rules change which points get flagged.",
    interactiveType: "Box Plot Builder",
    audience: "Students",
    order: 6,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "describing-data",
  },
  {
    slug: "data-distributions",
    title: "Data Distributions: Shape, Spread & Skew",
    description: "Pick distribution types and drag parameter sliders to reshape live histograms.",
    interactiveType: "Histogram Playground",
    audience: "Students",
    order: 7,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "describing-data",
  },
  {
    slug: "visualizing-data-charts",
    title: "Visualizing Data: Charts That Tell the Truth",
    description: "Build charts from a shared dataset and see which types reveal which patterns. A gallery of misleading charts and their fixes.",
    interactiveType: "Chart Builder + Gallery",
    audience: "Everyone",
    order: 8,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "describing-data",
  },

  // Unit 4: Probability Foundations
  {
    slug: "probability-fundamentals",
    title: "Probability Fundamentals: Rules of Chance",
    description: "Roll dice, flip coins, and draw cards while watching the addition, multiplication, and complement rules apply in real time.",
    interactiveType: "Interactive Calculator",
    audience: "Everyone",
    order: 9,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "probability-foundations",
  },
  {
    slug: "conditional-probability",
    title: "Conditional Probability & Independence",
    description: "Build tree diagrams and Venn diagrams from scratch. Toggle between conditioning on different events to see how probabilities shift.",
    interactiveType: "Tree Diagram Builder",
    audience: "Students",
    order: 10,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "probability-foundations",
  },
  {
    slug: "bayes-theorem",
    title: "Bayes' Theorem: Update Your Beliefs",
    description: "Step through Bayesian updating with medical testing scenarios. Adjust base rates and watch posteriors shift.",
    interactiveType: "Visual Walkthrough",
    audience: "Everyone",
    order: 11,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "probability-foundations",
  },
  {
    slug: "random-variables-expected-value",
    title: "Random Variables & Expected Value",
    description: "Define your own probability distribution with sliders, then simulate thousands of draws to verify expected value and variance.",
    interactiveType: "Simulation Playground",
    audience: "Students",
    order: 12,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "probability-foundations",
  },

  // Unit 5: Distributions
  {
    slug: "probability-distributions",
    title: "Probability Distributions Gallery",
    description: "Browse and interact with Normal, Poisson, Binomial, Exponential and more.",
    interactiveType: "Distribution Explorer",
    audience: "Data Scientists",
    order: 13,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "distributions",
  },
  {
    slug: "normal-distribution-z-scores",
    title: "The Normal Distribution & Z-Scores",
    description: "Shade regions under the bell curve and convert between raw scores and z-scores. Explore the 68-95-99.7 rule visually.",
    interactiveType: "Interactive Curve",
    audience: "Students",
    order: 14,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "distributions",
  },
  {
    slug: "student-t-chi-square-f",
    title: "Student's t, Chi-Square & F Distributions",
    description: "Compare these three distributions side by side as you adjust degrees of freedom. See when each one appears in statistical tests.",
    interactiveType: "Distribution Comparison",
    audience: "Students",
    order: 15,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "distributions",
  },
  {
    slug: "central-limit-theorem",
    title: "Sampling Distributions & the Central Limit Theorem",
    description: "Set any population shape and simulate thousands of samples. Watch the sampling distribution become normal.",
    interactiveType: "Live Simulation",
    audience: "Students",
    order: 16,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "distributions",
  },

  // Unit 6: Sampling & Estimation
  {
    slug: "sampling-methods-bias",
    title: "Sampling Methods & Bias",
    description: "Compare simple random, stratified, cluster, and convenience sampling on the same population. See how each introduces or avoids bias.",
    interactiveType: "Method Comparator",
    audience: "Everyone",
    order: 17,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "sampling-estimation",
  },
  {
    slug: "standard-error-point-estimates",
    title: "Standard Error & Point Estimates",
    description: "Generate samples of different sizes and watch the standard error shrink. Understand why larger samples are worth the cost.",
    interactiveType: "Estimation Playground",
    audience: "Students",
    order: 18,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "sampling-estimation",
  },
  {
    slug: "confidence-intervals",
    title: "Confidence Intervals: What They Actually Mean",
    description: "Generate 100 confidence intervals and see that roughly 5% miss the true parameter.",
    interactiveType: "Repeated Sampling Viz",
    audience: "Students",
    order: 19,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "sampling-estimation",
  },
  {
    slug: "sample-size-margin-of-error",
    title: "Sample Size, Margin of Error & Survey Design",
    description: "Dial in your desired confidence and margin of error to compute required sample size. See how survey design choices interact.",
    interactiveType: "Sample Size Calculator",
    audience: "Everyone",
    order: 20,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "sampling-estimation",
  },

  // Unit 7: Statistical Inference
  {
    slug: "hypothesis-testing",
    title: "Hypothesis Testing: A Visual Experiment",
    description: "Design an A/B test, then run 1000 simulations to see Type I and Type II errors play out.",
    interactiveType: "A/B Test Simulator",
    audience: "Product Managers",
    order: 21,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "statistical-inference",
  },
  {
    slug: "p-values",
    title: "P-Values Demystified",
    description: "Drag data points and watch the p-value shift on a live null distribution.",
    interactiveType: "Permutation Simulator",
    audience: "Everyone",
    order: 22,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "statistical-inference",
  },
  {
    slug: "statistical-power-effect-size",
    title: "Statistical Power & Effect Size",
    description: "Adjust effect size, sample size, and alpha to see how power changes. Visualize the overlap between null and alternative distributions.",
    interactiveType: "Power Calculator",
    audience: "Students",
    order: 23,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "statistical-inference",
  },
  {
    slug: "multiple-testing-false-discovery",
    title: "Multiple Testing & False Discovery",
    description: "Run 100 simultaneous tests on noise and watch false positives accumulate. Apply Bonferroni and FDR correction and see the trade-offs.",
    interactiveType: "Simulation Gallery",
    audience: "Data Scientists",
    order: 24,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "statistical-inference",
  },

  // Unit 8: Comparing Groups
  {
    slug: "t-tests-proportion-tests",
    title: "t-Tests & Proportion Tests: Comparing Two Groups",
    description: "Set group means, variances, and sample sizes, then run one-sample, two-sample, and paired t-tests with live effect visualizations.",
    interactiveType: "Test Laboratory",
    audience: "Students",
    order: 25,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "comparing-groups",
  },
  {
    slug: "anova-comparing-groups",
    title: "ANOVA: Comparing Many Groups",
    description: "Drag group distributions to build intuition for between-group vs within-group variance. Watch the F-statistic update in real time.",
    interactiveType: "Group Comparison Viz",
    audience: "Students",
    order: 26,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "comparing-groups",
  },
  {
    slug: "nonparametric-tests",
    title: "Nonparametric Tests: When Assumptions Fail",
    description: "Compare parametric and nonparametric tests on the same skewed dataset. See when rank-based tests outperform their parametric cousins.",
    interactiveType: "Assumption Checker",
    audience: "Students",
    order: 27,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "comparing-groups",
  },

  // Unit 9: Association & Dependence
  {
    slug: "correlation-covariance",
    title: "Correlation & Covariance",
    description: "Drag points on a scatter plot and watch the Pearson r update. Explore how outliers, clusters, and nonlinearity distort correlation.",
    interactiveType: "Interactive Scatter Plot",
    audience: "Everyone",
    order: 28,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "association-dependence",
  },
  {
    slug: "chi-square-independence",
    title: "Chi-Square Test of Independence",
    description: "Build a contingency table by picking categories and counts, then watch the test statistic and p-value compute live.",
    interactiveType: "Contingency Table Builder",
    audience: "Students",
    order: 29,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "association-dependence",
  },
  {
    slug: "regression-to-mean",
    title: "Regression to the Mean Explained",
    description: "Select top performers and retest them. Watch scores regress toward the mean.",
    interactiveType: "Scatter + Simulation",
    audience: "Everyone",
    order: 30,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "association-dependence",
  },
  {
    slug: "simpsons-paradox",
    title: "Simpson's Paradox & Lurking Variables",
    description: "Explore classic examples where aggregated trends reverse when data is broken into subgroups. Find the hidden confounder.",
    interactiveType: "Paradox Explorer",
    audience: "Everyone",
    order: 31,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "association-dependence",
  },

  // Unit 10: Regression Foundations
  {
    slug: "simple-linear-regression",
    title: "Simple Linear Regression: Fit the Line",
    description: "Drag data points and watch the OLS line, residuals, R², and coefficient estimates update in real time.",
    interactiveType: "Interactive Scatter",
    audience: "Students",
    order: 32,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "regression-foundations",
  },
  {
    slug: "multiple-regression-confounding",
    title: "Multiple Regression & Confounding",
    description: "Add and remove predictors to see how coefficient estimates change when confounders are controlled for.",
    interactiveType: "3D Scatter + Explorer",
    audience: "Data Scientists",
    order: 33,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "regression-foundations",
  },
  {
    slug: "regression-diagnostics",
    title: "Regression Diagnostics: When the Model Breaks",
    description: "Explore residual plots, QQ plots, and leverage diagnostics. Inject heteroscedasticity and non-normality and see how diagnostics catch them.",
    interactiveType: "Diagnostic Dashboard",
    audience: "Data Scientists",
    order: 34,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "regression-foundations",
  },

  // Unit 11: Generalized Models
  {
    slug: "logistic-regression",
    title: "Logistic Regression: Predicting Yes or No",
    description: "Adjust coefficients on a logistic curve and see how predicted probabilities change. Explore decision thresholds and log-odds.",
    interactiveType: "S-Curve Explorer",
    audience: "Students",
    order: 35,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "generalized-models",
  },
  {
    slug: "count-models-poisson",
    title: "Count Models: Poisson & Negative Binomial",
    description: "Model rare event counts with Poisson regression. See overdispersion and when to switch to negative binomial.",
    interactiveType: "Count Data Modeler",
    audience: "Data Scientists",
    order: 36,
    implemented: true,
    categorySlug: "statistics",
    unitSlug: "generalized-models",
  },

  // Unit 12: Experimental Design
  {
    slug: "ab-testing-workflow",
    title: "A/B Testing: The Complete Workflow",
    description: "Plan a complete experiment: set hypotheses, compute sample size, collect data, analyze results, and interpret with proper corrections.",
    interactiveType: "Experiment Builder",
    audience: "Product Managers",
    order: 37,
    implemented: false,
    categorySlug: "statistics",
    unitSlug: "experimental-design",
  },
  {
    slug: "causal-thinking-dags",
    title: "Causal Thinking: Confounders, Mediators & DAGs",
    description: "Build directed acyclic graphs by adding nodes and edges. See which variables to control for to identify causal effects.",
    interactiveType: "DAG Builder",
    audience: "Data Scientists",
    order: 38,
    implemented: false,
    categorySlug: "statistics",
    unitSlug: "experimental-design",
  },

  // Unit 13: Time Series
  {
    slug: "time-series-forecasting",
    title: "Time Series Fundamentals & Forecasting",
    description: "Decompose a time series into trend, seasonality, and residuals. Build simple forecasts and see how each component contributes.",
    interactiveType: "Decomposer + Forecast",
    audience: "Data Scientists",
    order: 39,
    implemented: false,
    categorySlug: "statistics",
    unitSlug: "time-series-forecasting",
  },

  // Unit 14: Multivariate Thinking
  {
    slug: "multivariate-thinking",
    title: "Multivariate Thinking & the Curse of Dimensionality",
    description: "Watch how nearest-neighbor distances collapse and data becomes sparse as dimensions increase. Explore dimensionality reduction intuition.",
    interactiveType: "Dimension Explorer",
    audience: "Data Scientists",
    order: 40,
    implemented: false,
    categorySlug: "statistics",
    unitSlug: "multivariate-thinking",
  },

  // Unit 15: Resampling
  {
    slug: "bootstrap-permutation-cv",
    title: "Bootstrap, Permutation Tests & Cross-Validation",
    description: "Resample data thousands of times and watch bootstrap confidence intervals form. Compare permutation p-values with parametric ones.",
    interactiveType: "Resampling Simulator",
    audience: "Data Scientists",
    order: 41,
    implemented: false,
    categorySlug: "statistics",
    unitSlug: "resampling-modern-methods",
  },

  // ── Data & Analysis (no units) ──────────────────────────────────────────

  {
    slug: "what-is-data",
    title: "What Is Data? Types & Structures",
    description: "Drag-and-drop data items into category buckets and watch them transform into clean visual representations with typed columns and tree structures.",
    interactiveType: "Interactive Explorer",
    audience: "Beginners",
    order: 1,
    implemented: true,
    categorySlug: "data-and-analysis",
  },
  {
    slug: "how-datasets-are-built",
    title: "How Datasets Are Built: From Raw to Ready",
    description: "Click through a five-stage animated pipeline with mini-challenges at each step on real messy data.",
    interactiveType: "Pipeline Walkthrough",
    audience: "Beginners",
    order: 2,
    implemented: true,
    categorySlug: "data-and-analysis",
  },
  {
    slug: "missing-data",
    title: "Missing Data: Why It Matters",
    description: "Toggle between imputation strategies and watch a dataset table update in real time with accuracy tradeoffs.",
    interactiveType: "Before/After Comparator",
    audience: "Students",
    order: 3,
    implemented: true,
    categorySlug: "data-and-analysis",
  },
  {
    slug: "feature-scaling",
    title: "Feature Scaling Playground",
    description: "Switch between normalization, standardization, and min-max scaling and watch data points compress and expand.",
    interactiveType: "Parameter Playground",
    audience: "Students",
    order: 4,
    implemented: true,
    categorySlug: "data-and-analysis",
  },
  {
    slug: "outlier-detection",
    title: "Outlier Detection: Spot the Odd One Out",
    description: "Drag data points and watch the mean, median, and regression line react. Toggle detection methods to see which points get flagged.",
    interactiveType: "Interactive Scatter",
    audience: "Beginners",
    order: 5,
    implemented: true,
    categorySlug: "data-and-analysis",
  },
  {
    slug: "correlation-causation",
    title: "Correlation vs Causation",
    description: "Explore spurious correlations, reveal hidden confounding variables, and test your own variable pairs.",
    interactiveType: "Example Explorer",
    audience: "Everyone",
    order: 6,
    implemented: true,
    categorySlug: "data-and-analysis",
  },
  {
    slug: "dimensionality-reduction",
    title: "Dimensionality Reduction: PCA, t-SNE & UMAP",
    description: "Watch 784-dimensional data collapse into clusters as you switch between methods and tune parameters.",
    interactiveType: "3D Scatter Explorer",
    audience: "Data Scientists",
    order: 7,
    implemented: true,
    categorySlug: "data-and-analysis",
  },
  {
    slug: "data-distributions-applied",
    title: "Data Distributions in Context",
    description: "Apply distribution knowledge to real-world datasets: sales, medical measurements, and social media engagement.",
    interactiveType: "Applied Case Studies",
    audience: "Students",
    order: 8,
    implemented: false,
    categorySlug: "data-and-analysis",
  },
  {
    slug: "data-pipeline",
    title: "The Data Pipeline: Source to Insight",
    description: "Watch data particles flow through an animated ETL pipeline. Inject errors and see how validation gates respond.",
    interactiveType: "Animated Flowchart",
    audience: "Product Managers",
    order: 9,
    implemented: true,
    categorySlug: "data-and-analysis",
  },

  // ── Machine Learning (no units) ─────────────────────────────────────────

  {
    slug: "what-is-ml",
    title: "What Is Machine Learning? The Big Picture",
    description: "Animated side-by-side comparison of rule-based programming vs ML across three real scenarios.",
    interactiveType: "Visual Essay",
    audience: "Beginners",
    order: 1,
    implemented: true,
    categorySlug: "machine-learning",
  },
  {
    slug: "linear-regression",
    title: "Linear Regression: Draw the Best Fit",
    description: "Drag data points and watch the regression line, loss function, and residuals update live.",
    interactiveType: "Interactive Scatter",
    audience: "Students",
    order: 2,
    implemented: true,
    categorySlug: "machine-learning",
  },
  {
    slug: "decision-trees",
    title: "Decision Trees: Build One Yourself",
    description: "Click to place split lines on a 2D dataset and build a tree manually.",
    interactiveType: "Interactive Builder",
    audience: "Students",
    order: 3,
    implemented: true,
    categorySlug: "machine-learning",
  },
  {
    slug: "k-means",
    title: "K-Means Clustering Step by Step",
    description: "Place initial centroids, then step through iterations watching clusters form.",
    interactiveType: "Step-by-Step Simulation",
    audience: "Students",
    order: 4,
    implemented: true,
    categorySlug: "machine-learning",
  },
  {
    slug: "knn",
    title: "KNN: How Many Neighbors Matter?",
    description: "Slide K from 1 to 20 and watch classification boundaries transform in real time.",
    interactiveType: "Boundary Visualizer",
    audience: "Students",
    order: 5,
    implemented: true,
    categorySlug: "machine-learning",
  },
  {
    slug: "svm",
    title: "SVM: Finding the Maximum Margin",
    description: "Drag data points and watch support vectors, margin, and decision boundary adjust live.",
    interactiveType: "Boundary Explorer",
    audience: "Data Scientists",
    order: 6,
    implemented: true,
    categorySlug: "machine-learning",
  },
  {
    slug: "random-forests",
    title: "Random Forests: Wisdom of the Crowd",
    description: "Watch individual decision trees vote together. Scale from 1 to 100 trees.",
    interactiveType: "Ensemble Visualizer",
    audience: "Students",
    order: 7,
    implemented: true,
    categorySlug: "machine-learning",
  },
  {
    slug: "gradient-descent",
    title: "Gradient Descent: Rolling Down the Hill",
    description: "Set the learning rate and watch a ball descend a 3D loss landscape.",
    interactiveType: "3D Landscape",
    audience: "ML Practitioners",
    order: 8,
    implemented: true,
    categorySlug: "machine-learning",
  },
  {
    slug: "overfitting-underfitting",
    title: "Overfitting vs Underfitting Playground",
    description: "Slide model complexity and watch training and validation error curves diverge.",
    interactiveType: "Complexity Slider",
    audience: "Students",
    order: 9,
    implemented: true,
    categorySlug: "machine-learning",
  },
  {
    slug: "cross-validation",
    title: "Cross-Validation: Why One Split Isn't Enough",
    description: "Watch data deal into K folds. Compare variance across 3-fold, 5-fold, and 10-fold.",
    interactiveType: "Fold Walkthrough",
    audience: "Students",
    order: 10,
    implemented: true,
    categorySlug: "machine-learning",
  },
  {
    slug: "confusion-matrix",
    title: "The Confusion Matrix & Beyond",
    description: "Drag a threshold slider and watch precision, recall, F1, and ROC curve update live.",
    interactiveType: "Interactive Calculator",
    audience: "Product Managers",
    order: 11,
    implemented: true,
    categorySlug: "machine-learning",
  },

  // ── Deep Learning (no units) ────────────────────────────────────────────

  {
    slug: "neural-network",
    title: "What Is a Neural Network?",
    description: "Watch pixel values propagate through layers. Click connections to inspect weights.",
    interactiveType: "Animated Network",
    audience: "Beginners",
    order: 1,
    implemented: true,
    categorySlug: "deep-learning",
  },
  {
    slug: "activation-functions",
    title: "Activation Functions: ReLU, Sigmoid & Friends",
    description: "Toggle between functions and see convergence differences and dead neurons.",
    interactiveType: "Function Plotter",
    audience: "ML Practitioners",
    order: 2,
    implemented: true,
    categorySlug: "deep-learning",
  },
  {
    slug: "backpropagation",
    title: "Backpropagation: How Networks Learn",
    description: "Step through forward and backward passes neuron by neuron.",
    interactiveType: "Step-by-Step Walkthrough",
    audience: "Students",
    order: 3,
    implemented: true,
    categorySlug: "deep-learning",
  },
  {
    slug: "cnns",
    title: "CNNs: See What Filters See",
    description: "Watch convolutional filters slide across images and activate feature maps. Explore edge detection, sharpening, and blur kernels.",
    interactiveType: "Filter Visualizer",
    audience: "ML Practitioners",
    order: 4,
    implemented: true,
    categorySlug: "deep-learning",
  },
  {
    slug: "pooling-layers",
    title: "Pooling Layers: Shrinking Without Losing",
    description: "Watch max and average pooling slide across a pixel grid.",
    interactiveType: "Grid Operation Demo",
    audience: "Students",
    order: 5,
    implemented: true,
    categorySlug: "deep-learning",
  },
  {
    slug: "rnns-lstms",
    title: "RNNs & LSTMs: Memory in Networks",
    description: "Watch information flow through recurrent cells and see gradients vanish over long sequences.",
    interactiveType: "Animated Cell Diagram",
    audience: "NLP Practitioners",
    order: 6,
    implemented: true,
    categorySlug: "deep-learning",
  },
  {
    slug: "dropout",
    title: "Dropout: Training with Missing Neurons",
    description: "Slide dropout probability and watch neurons randomly deactivate.",
    interactiveType: "Network Toggle",
    audience: "ML Practitioners",
    order: 7,
    implemented: true,
    categorySlug: "deep-learning",
  },
  {
    slug: "batch-normalization",
    title: "Batch Normalization Explained",
    description: "See activation distributions stabilize. Watch two networks race.",
    interactiveType: "Distribution Comparison",
    audience: "ML Practitioners",
    order: 8,
    implemented: true,
    categorySlug: "deep-learning",
  },
  {
    slug: "transfer-learning",
    title: "Transfer Learning: Stand on Giants' Shoulders",
    description: "Click layers to freeze or unfreeze a pretrained model.",
    interactiveType: "Layer Freezing Diagram",
    audience: "Students",
    order: 9,
    implemented: true,
    categorySlug: "deep-learning",
  },
  {
    slug: "optimizers-race",
    title: "Optimizers Race: SGD vs Adam vs RMSProp",
    description: "Three optimizers descend the same loss landscape simultaneously.",
    interactiveType: "Side-by-Side Race",
    audience: "ML Practitioners",
    order: 10,
    implemented: true,
    categorySlug: "deep-learning",
  },
  {
    slug: "gans",
    title: "GANs: The Art of Faking It",
    description: "Watch a generator evolve from noise to images while the discriminator scores.",
    interactiveType: "Adversarial Training Loop",
    audience: "Everyone",
    order: 11,
    implemented: true,
    categorySlug: "deep-learning",
  },

  // ── LLMs (no units) ────────────────────────────────────────────────────

  {
    slug: "what-is-llm",
    title: "What Is a Large Language Model?",
    description: "Animated journey from text input through billions of parameters to predictions.",
    interactiveType: "Visual Essay",
    audience: "Everyone",
    order: 1,
    implemented: true,
    categorySlug: "llms",
  },
  {
    slug: "tokenization",
    title: "Tokenization: How AI Reads Text",
    description: "Type anything and watch it split into colored token blocks in real time.",
    interactiveType: "Interactive Tokenizer",
    audience: "Developers",
    order: 2,
    implemented: true,
    categorySlug: "llms",
  },
  {
    slug: "embeddings",
    title: "Embeddings: Words as Numbers in Space",
    description: "Explore a 3D word space. Try word arithmetic like king - man + woman.",
    interactiveType: "3D Space Explorer",
    audience: "Developers",
    order: 3,
    implemented: true,
    categorySlug: "llms",
  },
  {
    slug: "self-attention",
    title: "Self-Attention: How Transformers Focus",
    description: "Type a sentence and see attention heatmaps. Step through layers.",
    interactiveType: "Attention Heatmap",
    audience: "ML Practitioners",
    order: 4,
    implemented: true,
    categorySlug: "llms",
  },
  {
    slug: "transformer-architecture",
    title: "The Transformer Architecture",
    description: "Click through every block with animated explainers for each component.",
    interactiveType: "Architecture Explorer",
    audience: "Developers",
    order: 5,
    implemented: true,
    categorySlug: "llms",
  },
  {
    slug: "temperature-topk",
    title: "Temperature & Top-K: Controlling Creativity",
    description: "Adjust generation parameters and watch probability distributions reshape.",
    interactiveType: "Parameter Playground",
    audience: "Developers",
    order: 6,
    implemented: true,
    categorySlug: "llms",
  },
  {
    slug: "context-windows",
    title: "Context Windows: What the Model Can See",
    description: "Slide context length and test information retrieval at different positions.",
    interactiveType: "Sliding Window Demo",
    audience: "Developers",
    order: 7,
    implemented: true,
    categorySlug: "llms",
  },
  {
    slug: "hallucination",
    title: "Hallucination: When AI Makes Things Up",
    description: "Explore examples of confident-sounding but wrong outputs.",
    interactiveType: "Example Explorer",
    audience: "Everyone",
    order: 8,
    implemented: true,
    categorySlug: "llms",
  },
  {
    slug: "fine-tuning-vs-prompting",
    title: "Fine-Tuning vs Prompting",
    description: "Try both approaches on the same task and compare. Interactive decision tree included.",
    interactiveType: "Decision Flowchart",
    audience: "Product Managers",
    order: 9,
    implemented: true,
    categorySlug: "llms",
  },
  {
    slug: "rag-explained",
    title: "RAG: Retrieval Augmented Generation",
    description: "Type a query and watch each RAG step execute with timing breakdowns.",
    interactiveType: "Pipeline Walkthrough",
    audience: "Developers",
    order: 10,
    implemented: true,
    categorySlug: "llms",
  },
  {
    slug: "vector-databases",
    title: "Vector Databases: Semantic Search",
    description: "Watch documents become vectors in 3D space. Query and see nearest neighbors.",
    interactiveType: "Vector Space Demo",
    audience: "Developers",
    order: 11,
    implemented: true,
    categorySlug: "llms",
  },
  {
    slug: "chunking-strategies",
    title: "Chunking Strategies for RAG",
    description: "See fixed-size, recursive, and semantic chunking applied side by side.",
    interactiveType: "Side-by-Side Comparator",
    audience: "ML Engineers",
    order: 12,
    implemented: true,
    categorySlug: "llms",
  },
  {
    slug: "prompt-engineering",
    title: "Prompt Engineering Patterns",
    description: "Browse a gallery of patterns with live demos and editable prompts.",
    interactiveType: "Pattern Gallery",
    audience: "Everyone",
    order: 13,
    implemented: true,
    categorySlug: "llms",
  },

  // ── Applied AI (no units) ───────────────────────────────────────────────

  {
    slug: "ai-agents",
    title: "AI Agents: Autonomy in Action",
    description: "Watch an agent loop through Think, Plan, Act, Observe cycles.",
    interactiveType: "Workflow Diagram",
    audience: "Product Managers",
    order: 1,
    implemented: true,
    categorySlug: "applied-ai",
  },
  {
    slug: "model-evaluation",
    title: "Model Evaluation: Beyond Accuracy",
    description: "Edit model outputs and watch BLEU, ROUGE, and perplexity update live.",
    interactiveType: "Metric Explorer",
    audience: "ML Engineers",
    order: 2,
    implemented: true,
    categorySlug: "applied-ai",
  },
  {
    slug: "rlhf",
    title: "RLHF: How Human Feedback Shapes AI",
    description: "Play the human rater and watch the model's behavior shift.",
    interactiveType: "Interactive Pipeline",
    audience: "ML Practitioners",
    order: 3,
    implemented: true,
    categorySlug: "applied-ai",
  },
  {
    slug: "lora-adapters",
    title: "LoRA & Adapters: Efficient Fine-Tuning",
    description: "Visualize low-rank adapter matrices. Compare vs full fine-tuning.",
    interactiveType: "Weight Matrix Diagram",
    audience: "ML Engineers",
    order: 4,
    implemented: true,
    categorySlug: "applied-ai",
  },
  {
    slug: "ai-safety",
    title: "AI Safety: Alignment in Practice",
    description: "Explore story-driven alignment scenarios. Toggle safety techniques on/off.",
    interactiveType: "Scenario Explorer",
    audience: "Everyone",
    order: 5,
    implemented: true,
    categorySlug: "applied-ai",
  },
  {
    slug: "ai-model-decision-guide",
    title: "Which AI Model Should I Use?",
    description: "Answer branching questions and get a model recommendation with side-by-side comparisons.",
    interactiveType: "Decision Tree",
    audience: "Product Managers",
    order: 6,
    implemented: false,
    categorySlug: "applied-ai",
  },
];

// ── Main seed function ───────────────────────────────────────────────────────

async function main() {
  console.log("Seeding visual guides curriculum…");

  // Step 1: Upsert categories
  console.log("  Upserting categories…");
  for (const cat of CATEGORIES) {
    await prisma.guideCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, color: cat.color, order: cat.order },
      create: { slug: cat.slug, name: cat.name, color: cat.color, order: cat.order },
    });
  }

  // Step 2: Build category slug → id map
  const categoryRecords = await prisma.guideCategory.findMany({
    select: { id: true, slug: true },
  });
  const catIdMap = Object.fromEntries(categoryRecords.map((c) => [c.slug, c.id]));

  // Step 3: Upsert Statistics units
  const statsId = catIdMap["statistics"];
  if (!statsId) throw new Error("Statistics category not found after upsert");

  console.log("  Upserting Statistics units…");
  for (const unit of STATS_UNITS) {
    await prisma.guideUnit.upsert({
      where: { slug: unit.slug },
      update: { name: unit.name, order: unit.order, categoryId: statsId },
      create: { slug: unit.slug, name: unit.name, order: unit.order, categoryId: statsId },
    });
  }

  // Step 4: Build unit slug → id map
  const unitRecords = await prisma.guideUnit.findMany({
    select: { id: true, slug: true },
  });
  const unitIdMap = Object.fromEntries(unitRecords.map((u) => [u.slug, u.id]));

  // Step 5: Upsert all guides
  console.log(`  Upserting ${GUIDES.length} guides…`);
  for (const guide of GUIDES) {
    const categoryId = catIdMap[guide.categorySlug];
    if (!categoryId) throw new Error(`Category not found: ${guide.categorySlug}`);

    const unitId = guide.unitSlug ? unitIdMap[guide.unitSlug] : null;
    if (guide.unitSlug && !unitId) throw new Error(`Unit not found: ${guide.unitSlug}`);

    const data = {
      title: guide.title,
      description: guide.description,
      interactiveType: guide.interactiveType,
      audience: guide.audience,
      order: guide.order,
      implemented: guide.implemented,
      categoryId,
      unitId: unitId ?? null,
    };

    await prisma.visualGuide.upsert({
      where: { slug: guide.slug },
      update: data,
      create: { slug: guide.slug, ...data },
    });
  }

  const total = await prisma.visualGuide.count();
  console.log(`Done. ${total} guides in database (all DRAFT).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
