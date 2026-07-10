/**
 * Retry economics for a call that succeeds (produces schema-valid output)
 * with probability p per attempt. Attempts to first success follow a
 * geometric distribution:
 *   P(first success on attempt k) = (1 - p)^(k - 1) * p
 *   E[attempts] = 1 / p
 * so the expected cost per valid output is pricePerCall / p.
 */

export function expectedAttemptsPerValid(p: number): number {
  if (p <= 0) return Infinity;
  return 1 / p;
}

export function expectedRetriesPerValid(p: number): number {
  return expectedAttemptsPerValid(p) - 1;
}

export function expectedCostPerValid(p: number, pricePerCall: number): number {
  return pricePerCall * expectedAttemptsPerValid(p);
}

export function firstSuccessAt(p: number, k: number): number {
  return Math.pow(1 - p, k - 1) * p;
}

export function successWithinK(p: number, k: number): number {
  return 1 - Math.pow(1 - p, k);
}

export interface AttemptRow {
  k: number;
  firstSuccessProb: number;
  cumulativeSuccessProb: number;
  spend: number;
}

export function buildAttemptTable(p: number, pricePerCall: number, maxK: number): AttemptRow[] {
  const rows: AttemptRow[] = [];
  for (let k = 1; k <= maxK; k++) {
    rows.push({
      k,
      firstSuccessProb: firstSuccessAt(p, k),
      cumulativeSuccessProb: successWithinK(p, k),
      spend: k * pricePerCall,
    });
  }
  return rows;
}

// ── Display formatting helpers ───────────────────────────────────────────────

export function formatPct(fraction: number, decimals = 1): string {
  return `${(fraction * 100).toFixed(decimals)}%`;
}

export function formatCount(x: number): string {
  if (!Number.isFinite(x)) return "∞";
  if (x >= 100) return Math.round(x).toLocaleString("en-US");
  if (x >= 10) return x.toFixed(1);
  return x.toFixed(2);
}

export function formatUsd(x: number): string {
  if (!Number.isFinite(x)) return "∞";
  if (x >= 1000) return `$${Math.round(x).toLocaleString("en-US")}`;
  if (x >= 1) return `$${x.toFixed(2)}`;
  return `$${x.toFixed(4)}`;
}
