// Dependency-free PCA, computed for real in the browser.
// Method: mean-center, build the sample covariance matrix (ddof = 1), then extract
// the top-k eigenvectors by power iteration with deflation. Deterministic: fixed
// start vectors, and each component's largest-magnitude entry is flipped positive
// (the same sign convention applied to the offline scikit-learn reference this
// implementation is verified against).

export interface PcaResult {
  /** k x d unit-length principal axes */
  components: number[][];
  /** eigenvalues of the sample covariance matrix (variance along each PC) */
  explainedVariance: number[];
  /** fraction of total variance captured by each PC */
  explainedRatio: number[];
  /** n x k scores: each input row projected onto the k components */
  projection: number[][];
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function normalize(v: number[]): number {
  const norm = Math.sqrt(dot(v, v));
  if (norm > 0) for (let i = 0; i < v.length; i++) v[i] /= norm;
  return norm;
}

export function computePca(data: number[][], k: number): PcaResult {
  const n = data.length;
  const d = data[0].length;

  const mean = new Array<number>(d).fill(0);
  for (const row of data) for (let j = 0; j < d; j++) mean[j] += row[j];
  for (let j = 0; j < d; j++) mean[j] /= n;
  const X = data.map(row => row.map((v, j) => v - mean[j]));

  // Sample covariance (ddof = 1), symmetric d x d
  const C: number[][] = Array.from({ length: d }, () => new Array<number>(d).fill(0));
  for (const row of X) {
    for (let a = 0; a < d; a++) {
      const ra = row[a];
      if (ra === 0) continue;
      for (let b = a; b < d; b++) C[a][b] += ra * row[b];
    }
  }
  for (let a = 0; a < d; a++) {
    for (let b = a; b < d; b++) {
      C[a][b] /= n - 1;
      C[b][a] = C[a][b];
    }
  }
  let totalVariance = 0;
  for (let j = 0; j < d; j++) totalVariance += C[j][j];

  const components: number[][] = [];
  const eigenvalues: number[] = [];
  const w = new Array<number>(d).fill(0);

  for (let c = 0; c < k; c++) {
    // deterministic start vector, different per component
    let v = Array.from({ length: d }, (_, j) => Math.sin(j * 1.7 + c * 3.1) + 0.5);
    normalize(v);
    let lambda = 0;
    for (let iter = 0; iter < 1000; iter++) {
      for (let a = 0; a < d; a++) w[a] = dot(C[a], v);
      lambda = normalize(w);
      const converged = 1 - Math.abs(dot(w, v)) < 1e-14 && iter > 10;
      for (let a = 0; a < d; a++) v[a] = w[a];
      if (converged) break;
    }
    // sign convention: largest-magnitude entry positive
    let jMax = 0;
    for (let j = 1; j < d; j++) if (Math.abs(v[j]) > Math.abs(v[jMax])) jMax = j;
    if (v[jMax] < 0) v = v.map(x => -x);

    components.push(v);
    eigenvalues.push(lambda);
    // deflate: C <- C - lambda * v v^T
    for (let a = 0; a < d; a++) {
      for (let b = 0; b < d; b++) C[a][b] -= lambda * v[a] * v[b];
    }
  }

  const projection = X.map(row => components.map(comp => dot(row, comp)));
  return {
    components,
    explainedVariance: eigenvalues,
    explainedRatio: eigenvalues.map(l => l / totalVariance),
    projection,
  };
}

// Deterministic Gaussian noise (seeded mulberry32 + Box-Muller): no Math.random,
// so the same sigma always produces the same perturbed dataset.
export function addGaussianNoise(data: number[][], sigma: number, seed: number): number[][] {
  if (sigma === 0) return data;
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const gaussian = () => {
    const u = Math.max(rand(), 1e-12);
    const v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return data.map(row => row.map(x => x + sigma * gaussian()));
}
