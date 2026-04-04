"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

type CatId = "data" | "stats" | "ml" | "dl" | "llm" | "applied";

type Guide = {
  cat: CatId;
  catLabel: string;
  title: string;
  desc: string;
  style: string;
  audience: string;
  slug?: string; // only set for implemented guides
};

const CATEGORIES: { id: CatId; label: string; fullLabel: string; color: string }[] = [
  { id: "data",    label: "Data & Analysis",  fullLabel: "Data & Data Analysis",  color: "#3b82f6" },
  { id: "stats",   label: "Statistics",        fullLabel: "Statistics",             color: "#d4af37" },
  { id: "ml",      label: "Machine Learning",  fullLabel: "Machine Learning",       color: "#3bb4a4" },
  { id: "dl",      label: "Deep Learning",     fullLabel: "Deep Learning",          color: "#a855f7" },
  { id: "llm",     label: "LLMs",              fullLabel: "Large Language Models",  color: "#ef4444" },
  { id: "applied", label: "Applied AI",        fullLabel: "Applied AI",             color: "#ec4899" },
];

const GUIDES: Guide[] = [
  // Data & Analysis
  { cat: "data", catLabel: "Data & Analysis", title: "What Is Data? Types & Structures", desc: "Drag-and-drop data items into category buckets and watch them transform into clean visual representations with typed columns and tree structures.", style: "Interactive Explorer", audience: "Beginners", slug: "what-is-data" },
  { cat: "data", catLabel: "Data & Analysis", title: "How Datasets Are Built: From Raw to Ready", desc: "Click through a five-stage animated pipeline with mini-challenges at each step on real messy data.", style: "Pipeline Walkthrough", audience: "Beginners" },
  { cat: "data", catLabel: "Data & Analysis", title: "Missing Data: Why It Matters", desc: "Toggle between imputation strategies and watch a dataset table update in real time with accuracy tradeoffs.", style: "Before/After Comparator", audience: "Students" },
  { cat: "data", catLabel: "Data & Analysis", title: "Feature Scaling Playground", desc: "Switch between normalization, standardization, and min-max scaling and watch data points compress and expand.", style: "Parameter Playground", audience: "Students" },
  { cat: "data", catLabel: "Data & Analysis", title: "Outlier Detection: Spot the Odd One Out", desc: "Drag data points and watch the mean, median, and regression line react. Toggle detection methods to see which points get flagged.", style: "Interactive Scatter", audience: "Beginners" },
  { cat: "data", catLabel: "Data & Analysis", title: "Correlation vs Causation", desc: "Explore spurious correlations, reveal hidden confounding variables, and test your own variable pairs.", style: "Example Explorer", audience: "Everyone" },
  { cat: "data", catLabel: "Data & Analysis", title: "Dimensionality Reduction: PCA, t-SNE & UMAP", desc: "Watch 784-dimensional data collapse into clusters as you switch between methods and tune parameters.", style: "3D Scatter Explorer", audience: "Data Scientists" },
  { cat: "data", catLabel: "Data & Analysis", title: "Data Distributions: Shape, Spread & Skew", desc: "Pick distribution types and drag parameter sliders to reshape live histograms.", style: "Histogram Playground", audience: "Students" },
  { cat: "data", catLabel: "Data & Analysis", title: "The Data Pipeline: Source to Insight", desc: "Watch data particles flow through an animated ETL pipeline. Inject errors and see how validation gates respond.", style: "Animated Flowchart", audience: "Product Managers" },
  // Statistics
  { cat: "stats", catLabel: "Statistics", title: "Central Limit Theorem in Action", desc: "Set any population shape and simulate thousands of samples. Watch the sampling distribution become normal.", style: "Live Simulation", audience: "Students" },
  { cat: "stats", catLabel: "Statistics", title: "P-Values Demystified", desc: "Drag data points and watch the p-value shift on a live null distribution.", style: "Slider Simulation", audience: "Everyone" },
  { cat: "stats", catLabel: "Statistics", title: "Confidence Intervals: What They Actually Mean", desc: "Generate 100 confidence intervals and see that roughly 5% miss the true parameter.", style: "Repeated Sampling", audience: "Students" },
  { cat: "stats", catLabel: "Statistics", title: "Bayes' Theorem: Update Your Beliefs", desc: "Step through Bayesian updating with medical testing scenarios. Adjust base rates and watch posteriors shift.", style: "Visual Walkthrough", audience: "Everyone" },
  { cat: "stats", catLabel: "Statistics", title: "Probability Distributions Gallery", desc: "Browse and interact with Normal, Poisson, Binomial, Exponential and more.", style: "Distribution Explorer", audience: "Data Scientists" },
  { cat: "stats", catLabel: "Statistics", title: "Hypothesis Testing: A Visual Experiment", desc: "Design an A/B test, then run 1000 simulations to see Type I and Type II errors play out.", style: "Experiment Simulator", audience: "Product Managers" },
  { cat: "stats", catLabel: "Statistics", title: "Regression to the Mean", desc: "Select top performers and retest them. Watch scores regress toward the mean.", style: "Interactive Scatter", audience: "Everyone" },
  { cat: "stats", catLabel: "Statistics", title: "Bias vs Variance: The Bullseye", desc: "Throw darts at a target while adjusting bias and variance sliders.", style: "Interactive Game", audience: "ML Beginners" },
  // Machine Learning
  { cat: "ml", catLabel: "Machine Learning", title: "What Is Machine Learning? The Big Picture", desc: "Animated side-by-side comparison of rule-based programming vs ML across three real scenarios.", style: "Visual Essay", audience: "Beginners" },
  { cat: "ml", catLabel: "Machine Learning", title: "Linear Regression: Draw the Best Fit", desc: "Drag data points and watch the regression line, loss function, and residuals update live.", style: "Interactive Scatter", audience: "Students" },
  { cat: "ml", catLabel: "Machine Learning", title: "Decision Trees: Build One Yourself", desc: "Click to place split lines on a 2D dataset and build a tree manually.", style: "Interactive Builder", audience: "Students" },
  { cat: "ml", catLabel: "Machine Learning", title: "K-Means Clustering Step by Step", desc: "Place initial centroids, then step through iterations watching clusters form.", style: "Step-by-Step Simulation", audience: "Students" },
  { cat: "ml", catLabel: "Machine Learning", title: "KNN: How Many Neighbors Matter?", desc: "Slide K from 1 to 20 and watch classification boundaries transform in real time.", style: "Boundary Visualizer", audience: "Students" },
  { cat: "ml", catLabel: "Machine Learning", title: "SVM: Finding the Maximum Margin", desc: "Drag data points and watch support vectors, margin, and decision boundary adjust live.", style: "Boundary Explorer", audience: "Data Scientists" },
  { cat: "ml", catLabel: "Machine Learning", title: "Random Forests: Wisdom of the Crowd", desc: "Watch individual decision trees vote together. Scale from 1 to 100 trees.", style: "Ensemble Visualizer", audience: "Students" },
  { cat: "ml", catLabel: "Machine Learning", title: "Gradient Descent: Rolling Down the Hill", desc: "Set the learning rate and watch a ball descend a 3D loss landscape.", style: "3D Landscape", audience: "ML Practitioners" },
  { cat: "ml", catLabel: "Machine Learning", title: "Overfitting vs Underfitting Playground", desc: "Slide model complexity and watch training and validation error curves diverge.", style: "Complexity Slider", audience: "Students" },
  { cat: "ml", catLabel: "Machine Learning", title: "Cross-Validation: Why One Split Isn't Enough", desc: "Watch data deal into K folds. Compare variance across 3-fold, 5-fold, and 10-fold.", style: "Fold Walkthrough", audience: "Students" },
  { cat: "ml", catLabel: "Machine Learning", title: "The Confusion Matrix Decoded", desc: "Drag a threshold slider and watch precision, recall, and F1 update live.", style: "Interactive Calculator", audience: "Product Managers" },
  { cat: "ml", catLabel: "Machine Learning", title: "ROC Curves & AUC: Threshold Tuning", desc: "Sweep the classification threshold and watch the ROC curve trace itself.", style: "Threshold Slider", audience: "Data Scientists" },
  // Deep Learning
  { cat: "dl", catLabel: "Deep Learning", title: "What Is a Neural Network?", desc: "Watch pixel values propagate through layers. Click connections to inspect weights.", style: "Animated Network", audience: "Beginners" },
  { cat: "dl", catLabel: "Deep Learning", title: "Activation Functions: ReLU, Sigmoid & Friends", desc: "Toggle between functions and see convergence differences and dead neurons.", style: "Function Plotter", audience: "ML Practitioners" },
  { cat: "dl", catLabel: "Deep Learning", title: "Backpropagation: How Networks Learn", desc: "Step through forward and backward passes neuron by neuron.", style: "Step-by-Step Walkthrough", audience: "Students" },
  { cat: "dl", catLabel: "Deep Learning", title: "CNNs: See What Filters See", desc: "Upload an image and watch convolutional filters activate layer by layer.", style: "Filter Visualizer", audience: "ML Practitioners" },
  { cat: "dl", catLabel: "Deep Learning", title: "Pooling Layers: Shrinking Without Losing", desc: "Watch max and average pooling slide across a pixel grid.", style: "Grid Operation Demo", audience: "Students" },
  { cat: "dl", catLabel: "Deep Learning", title: "RNNs & LSTMs: Memory in Networks", desc: "Watch information flow through recurrent cells and see gradients vanish over long sequences.", style: "Animated Cell Diagram", audience: "NLP Practitioners" },
  { cat: "dl", catLabel: "Deep Learning", title: "Dropout: Training with Missing Neurons", desc: "Slide dropout probability and watch neurons randomly deactivate.", style: "Network Toggle", audience: "ML Practitioners" },
  { cat: "dl", catLabel: "Deep Learning", title: "Batch Normalization Explained", desc: "See activation distributions stabilize. Watch two networks race.", style: "Distribution Comparison", audience: "ML Practitioners" },
  { cat: "dl", catLabel: "Deep Learning", title: "Transfer Learning: Stand on Giants' Shoulders", desc: "Click layers to freeze or unfreeze a pretrained model.", style: "Layer Freezing Diagram", audience: "Students" },
  { cat: "dl", catLabel: "Deep Learning", title: "Optimizers Race: SGD vs Adam vs RMSProp", desc: "Three optimizers descend the same loss landscape simultaneously.", style: "Side-by-Side Race", audience: "ML Practitioners" },
  { cat: "dl", catLabel: "Deep Learning", title: "GANs: The Art of Faking It", desc: "Watch a generator evolve from noise to images while the discriminator scores.", style: "Adversarial Training Loop", audience: "Everyone" },
  // LLMs
  { cat: "llm", catLabel: "LLMs", title: "What Is a Large Language Model?", desc: "Animated journey from text input through billions of parameters to predictions.", style: "Visual Essay", audience: "Everyone" },
  { cat: "llm", catLabel: "LLMs", title: "Tokenization: How AI Reads Text", desc: "Type anything and watch it split into colored token blocks in real time.", style: "Interactive Tokenizer", audience: "Developers" },
  { cat: "llm", catLabel: "LLMs", title: "Embeddings: Words as Numbers in Space", desc: "Explore a 3D word space. Try word arithmetic like king - man + woman.", style: "3D Space Explorer", audience: "Developers" },
  { cat: "llm", catLabel: "LLMs", title: "Self-Attention: How Transformers Focus", desc: "Type a sentence and see attention heatmaps. Step through layers.", style: "Attention Heatmap", audience: "ML Practitioners" },
  { cat: "llm", catLabel: "LLMs", title: "The Transformer Architecture", desc: "Click through every block with animated explainers for each component.", style: "Architecture Explorer", audience: "Developers" },
  { cat: "llm", catLabel: "LLMs", title: "Temperature & Top-K: Controlling Creativity", desc: "Adjust generation parameters and watch probability distributions reshape.", style: "Parameter Playground", audience: "Developers" },
  { cat: "llm", catLabel: "LLMs", title: "Context Windows: What the Model Can See", desc: "Slide context length and test information retrieval at different positions.", style: "Sliding Window Demo", audience: "Developers" },
  { cat: "llm", catLabel: "LLMs", title: "Hallucination: When AI Makes Things Up", desc: "Explore examples of confident-sounding but wrong outputs.", style: "Example Explorer", audience: "Everyone" },
  { cat: "llm", catLabel: "LLMs", title: "Fine-Tuning vs Prompting", desc: "Try both approaches on the same task and compare. Interactive decision tree included.", style: "Decision Flowchart", audience: "Product Managers" },
  // Applied AI
  { cat: "applied", catLabel: "Applied AI", title: "RAG: Retrieval Augmented Generation", desc: "Type a query and watch each RAG step execute with timing breakdowns.", style: "Pipeline Walkthrough", audience: "Developers" },
  { cat: "applied", catLabel: "Applied AI", title: "Vector Databases: Semantic Search", desc: "Watch documents become vectors in 3D space. Query and see nearest neighbors.", style: "Vector Space Demo", audience: "Developers" },
  { cat: "applied", catLabel: "Applied AI", title: "Chunking Strategies for RAG", desc: "See fixed-size, recursive, and semantic chunking applied side by side.", style: "Side-by-Side Comparator", audience: "ML Engineers" },
  { cat: "applied", catLabel: "Applied AI", title: "Prompt Engineering Patterns", desc: "Browse a gallery of patterns with live demos and editable prompts.", style: "Pattern Gallery", audience: "Everyone" },
  { cat: "applied", catLabel: "Applied AI", title: "AI Agents: Autonomy in Action", desc: "Watch an agent loop through Think, Plan, Act, Observe cycles.", style: "Workflow Diagram", audience: "Product Managers" },
  { cat: "applied", catLabel: "Applied AI", title: "Model Evaluation: Beyond Accuracy", desc: "Edit model outputs and watch BLEU, ROUGE, and perplexity update live.", style: "Metric Explorer", audience: "ML Engineers" },
  { cat: "applied", catLabel: "Applied AI", title: "RLHF: How Human Feedback Shapes AI", desc: "Play the human rater and watch the model's behavior shift.", style: "Interactive Pipeline", audience: "ML Practitioners" },
  { cat: "applied", catLabel: "Applied AI", title: "LoRA & Adapters: Efficient Fine-Tuning", desc: "Visualize low-rank adapter matrices. Compare vs full fine-tuning.", style: "Weight Matrix Diagram", audience: "ML Engineers" },
  { cat: "applied", catLabel: "Applied AI", title: "AI Safety: Alignment in Practice", desc: "Explore story-driven alignment scenarios. Toggle safety techniques on/off.", style: "Scenario Explorer", audience: "Everyone" },
  { cat: "applied", catLabel: "Applied AI", title: "Which AI Model Should I Use?", desc: "Answer branching questions. Get a recommendation with side-by-side comparisons.", style: "Decision Tree", audience: "Product Managers" },
];

export default function VisualGuidesClient() {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const { data: session } = useSession();
  const [completions, setCompletions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/visual-guides/progress")
      .then((r) => r.json())
      .then((data) => {
        setCompletions(new Set(data.completions.map((c: { guideSlug: string }) => c.guideSlug)));
      })
      .catch(() => {});
  }, [session?.user]);

  const filtered = GUIDES.filter((g) => activeFilter === "all" || g.cat === activeFilter);

  // Group by category, preserving order
  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    guides: filtered.filter((g) => g.cat === cat.id),
  })).filter((cat) => cat.guides.length > 0);

  function handleFilter(id: string) {
    setActiveFilter(id);
  }

  // Gradient for the learning path connector line
  const pathGradient = CATEGORIES.map((c) => c.color).join(", ");

  return (
    <div className="pb-16">
      {/* Hero */}
      <section className="max-w-[1400px] mx-auto px-4 pt-6 pb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="w-6 h-px bg-[var(--color-accent)]" />
          <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
            Interactive Learning
          </span>
          <span className="w-6 h-px bg-[var(--color-accent)]" />
        </div>

        <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-none mb-5">
          Understand{" "}
          <span className="text-[var(--color-accent)]">AI</span>,{" "}
          <br />
          <span className="text-[var(--color-secondary)]">Visually</span>
        </h1>

        <p className="text-base text-[var(--color-text-muted)] leading-relaxed max-w-lg mx-auto mb-8">
          Interactive explorations of data science, machine learning, and AI concepts.
          No jargon. No walls of math. Just clarity.
        </p>

        {/* Stats */}
        <div className="flex justify-center gap-10 sm:gap-14 flex-wrap mb-8">
          {[
            { num: GUIDES.length, label: "Visual Guides" },
            { num: CATEGORIES.length, label: "Categories" },
            { num: "100%", label: "Interactive" },
          ].map(({ num, label }) => (
            <div key={label} className="text-center">
              <div className="text-3xl font-extrabold text-[var(--color-accent)]">{num}</div>
              <div className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wide mt-0.5">
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Learning path (desktop only) */}
        <div className="hidden sm:block max-w-2xl mx-auto mb-2 px-4">
          <div className="relative flex items-center justify-between">
            {/* connector line */}
            <div
              className="absolute top-1/2 -translate-y-1/2 left-[28px] right-[28px] h-px opacity-25"
              style={{ background: `linear-gradient(90deg, ${pathGradient})` }}
            />
            {CATEGORIES.map((cat, i) => (
              <button
                key={cat.id}
                onClick={() => handleFilter(cat.id)}
                className="relative z-10 flex flex-col items-center gap-1.5 group"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white/10 shadow-lg group-hover:scale-110 transition-transform"
                  style={{ background: cat.color }}
                >
                  {i + 1}
                </div>
                <span className="text-[10px] font-semibold text-[var(--color-text-muted)] group-hover:text-white transition-colors whitespace-nowrap">
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Sticky filter bar */}
      <div className="sticky top-[72px] z-40 bg-[#0f172a]/90 backdrop-blur-xl py-4 border-b border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-4">
          {/* Category pills */}
          <div className="flex justify-center gap-1.5 flex-wrap">
            <button
              onClick={() => handleFilter("all")}
              className={`px-3.5 py-1.5 rounded-xl text-[13px] font-semibold border transition-all ${
                activeFilter === "all"
                  ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-[#0f172a]"
                  : "border-white/10 text-[var(--color-text-muted)] hover:border-white/20 hover:text-white"
              }`}
            >
              All Guides
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleFilter(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-[13px] font-semibold border transition-all ${
                  activeFilter === cat.id
                    ? "border-transparent text-white"
                    : "border-white/10 text-[var(--color-text-muted)] hover:border-white/20 hover:text-white"
                }`}
                style={
                  activeFilter === cat.id
                    ? { background: cat.color, borderColor: cat.color }
                    : undefined
                }
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards grid */}
      <div className="max-w-[1400px] mx-auto px-4 pt-2">
        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-[var(--color-text-muted)] py-20"
            >
              No guides match your search.
            </motion.p>
          ) : (
            <motion.div key={activeFilter} initial={false}>
              {grouped.map((cat) => (
                <div key={cat.id}>
                  {/* Category header */}
                  <div className="flex items-center gap-3 mt-10 mb-4 pb-2.5 border-b border-white/[0.07]">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: cat.color }}
                    >
                      {CATEGORIES.findIndex((c) => c.id === cat.id) + 1}
                    </div>
                    <h2 className="text-xl font-extrabold tracking-tight text-white">
                      {cat.fullLabel}
                    </h2>
                    <span className="ml-auto text-xs text-[var(--color-text-muted)]">
                      {cat.guides.length} guide{cat.guides.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cat.guides.map((guide, i) => {
                      const card = (
                        <motion.div
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04, duration: 0.35 }}
                          className="relative flex flex-col bg-[var(--background)] border border-white/[0.07] rounded-2xl overflow-hidden hover:border-white/20 hover:-translate-y-1 transition-all cursor-pointer group"
                        >
                          {/* Colored top accent */}
                          <div className="h-0.5 w-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: cat.color }} />

                          {/* Completion badge */}
                          {guide.slug && completions.has(guide.slug) && (
                            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#3bb4a4]/15 border border-[#3bb4a4]/30 rounded-lg px-2.5 py-1 z-10">
                              <svg className="w-3.5 h-3.5 text-[#3bb4a4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-[10px] font-semibold text-[#3bb4a4] uppercase tracking-wide">
                                Completed
                              </span>
                            </div>
                          )}

                          <div className="flex flex-col flex-1 p-[18px]">
                            <p
                              className="text-[10px] font-semibold uppercase tracking-[0.8px] mb-2"
                              style={{ color: cat.color }}
                            >
                              {guide.catLabel}
                            </p>
                            <h3 className="text-[15px] font-semibold text-white leading-snug mb-2">
                              {guide.title}
                            </h3>
                            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed line-clamp-2 mb-3 flex-1">
                              {guide.desc}
                            </p>
                            <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.07] mt-auto">
                              <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
                                <span>{guide.style}</span>
                                <span className="text-white/20">&middot;</span>
                                <span>{guide.audience}</span>
                              </div>
                              <span
                                className="text-[13px] font-medium transition-all group-hover:translate-x-1"
                                style={{ color: "var(--color-accent)" }}
                              >
                                Explore &rarr;
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      );

                      return guide.slug ? (
                        <Link key={guide.title} href={`/visual-guides/${guide.slug}`} className="block">
                          {card}
                        </Link>
                      ) : (
                        <div key={guide.title}>{card}</div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
