import type { TrainingStep } from "./types";

function lcg(seed: number): number {
  return (seed * 1664525 + 1013904223) & 0xffffffff;
}

export const TRAINING_STEPS: TrainingStep[] = Array.from({ length: 31 }, (_, epoch) => {
  const quality = Math.min(1, epoch / 28);
  const dAcc = Math.max(0.5, 0.95 - quality * 0.45 + Math.sin(epoch) * 0.03);
  const gLoss = Math.max(0.5, 2.5 - epoch * 0.06 + Math.sin(epoch * 1.5) * 0.15);
  const dLoss = 0.1 + quality * 0.6 + Math.sin(epoch * 2) * 0.05;

  // Generate 8x8 grid: interpolate between pure noise and a target circle
  const grid: number[][] = [];
  for (let r = 0; r < 8; r++) {
    const row: number[] = [];
    for (let c = 0; c < 8; c++) {
      let seed = epoch * 64 + r * 8 + c;
      seed = lcg(seed);
      seed = lcg(seed);
      const noise = (seed >>> 0) % 256;
      // Target: white circle on dark background
      const cx = 3.5;
      const cy = 3.5;
      const dist = Math.sqrt((r - cy) ** 2 + (c - cx) ** 2);
      const circle = dist < 2.5 ? 220 : 20;
      const value = noise * (1 - quality) + circle * quality;
      row.push(Math.min(255, Math.max(0, Math.round(value))));
    }
    grid.push(row);
  }

  return {
    epoch,
    phase: epoch === 0 ? "idle" : epoch % 2 === 0 ? "train-d" : "train-g",
    generatorLoss: gLoss,
    discriminatorLoss: dLoss,
    dAccuracy: dAcc,
    generatorQuality: quality,
    fakeImage: grid,
  };
});
