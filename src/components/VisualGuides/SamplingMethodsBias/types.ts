export type SamplingMethod = "random" | "stratified" | "cluster" | "systematic" | "convenience";

export interface PopulationUnit {
  id: number;
  group: "A" | "B";
  value: number;
  x: number; // for visualization (0-1)
  y: number; // for visualization (0-1)
}

export interface SamplingState {
  population: PopulationUnit[];
  populationMean: number;
  populationSD: number;
  selectedMethod: SamplingMethod;
  sampleSize: number;
  currentSample: PopulationUnit[];
  sampleMean: number;
  sampleSD: number;
  repeatedMeans: number[];
  drawCount: number;
  methodsUsed: Set<SamplingMethod>;
  sizeAdjusted: boolean;
  galleryViewed: boolean;
}

// ── Population generation ─────────────────────────────────────────────────────

function gaussianRandom(mean: number, sd: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function generatePopulation(n: number = 1000): PopulationUnit[] {
  const groupACount = Math.floor(n * 0.6);
  return Array.from({ length: n }, (_, i) => {
    const isA = i < groupACount;
    return {
      id: i,
      group: isA ? "A" : "B",
      value: gaussianRandom(isA ? 55 : 75, 8),
      x: Math.random(),
      // Group A concentrates in low-y "neighborhoods", group B in high-y ones,
      // so the y-band clusters used by cluster sampling are internally similar.
      // That is what makes the design effect (higher variance across cluster
      // draws than SRS) genuinely visible in the repeated-draws chart.
      y: isA ? Math.random() * 0.6 : 0.4 + Math.random() * 0.6,
    };
  });
}

export function computeMean(units: PopulationUnit[]): number {
  if (units.length === 0) return 0;
  return units.reduce((s, u) => s + u.value, 0) / units.length;
}

export function computeSD(units: PopulationUnit[]): number {
  if (units.length === 0) return 0;
  const m = computeMean(units);
  return Math.sqrt(units.reduce((s, u) => s + (u.value - m) ** 2, 0) / units.length);
}

// ── Sampling algorithms ───────────────────────────────────────────────────────

function drawRandom(pop: PopulationUnit[], n: number): PopulationUnit[] {
  const shuffled = [...pop].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function drawStratified(pop: PopulationUnit[], n: number): PopulationUnit[] {
  const A = pop.filter(u => u.group === "A");
  const B = pop.filter(u => u.group === "B");
  const nA = Math.round(n * A.length / pop.length);
  return [...drawRandom(A, nA), ...drawRandom(B, n - nA)];
}

function drawCluster(pop: PopulationUnit[], n: number): PopulationUnit[] {
  const numClusters = 10;
  const clusters: PopulationUnit[][] = Array.from({ length: numClusters }, () => []);
  pop.forEach(u => clusters[Math.floor(u.y * numClusters)]!.push(u));
  const needed = Math.ceil(n / (pop.length / numClusters));
  const selected: PopulationUnit[] = [];
  const indices = [...Array(numClusters).keys()].sort(() => Math.random() - 0.5).slice(0, needed);
  indices.forEach(i => selected.push(...(clusters[i] ?? [])));
  return selected.slice(0, n);
}

function drawSystematic(pop: PopulationUnit[], n: number): PopulationUnit[] {
  const k = Math.floor(pop.length / n);
  const start = Math.floor(Math.random() * k);
  const result: PopulationUnit[] = [];
  for (let i = start; i < pop.length && result.length < n; i += k) result.push(pop[i]!);
  return result;
}

function drawConvenience(pop: PopulationUnit[], n: number): PopulationUnit[] {
  const B = pop.filter(u => u.group === "B");
  return drawRandom(B, Math.min(n, B.length));
}

export function drawSample(method: SamplingMethod, pop: PopulationUnit[], n: number): PopulationUnit[] {
  switch (method) {
    case "random":      return drawRandom(pop, n);
    case "stratified":  return drawStratified(pop, n);
    case "cluster":     return drawCluster(pop, n);
    case "systematic":  return drawSystematic(pop, n);
    case "convenience": return drawConvenience(pop, n);
  }
}
