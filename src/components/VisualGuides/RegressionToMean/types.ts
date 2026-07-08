export function gaussRand(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export interface Student {
  id: number;
  name: string;
  test1: number;
  test2: number;
}

const NAMES = [
  "Alice","Bob","Carlos","Diana","Ethan","Fatima","George","Hannah",
  "Ivan","Julia","Kevin","Laura","Marcus","Nina","Oscar","Priya",
  "Quentin","Rachel","Sam","Tara","Uma","Victor","Wendy","Xavier",
  "Yara","Zach","Aiden","Belle","Cody","Dara",
];

export function generateStudents(n: number = 30, correlation: number = 0.6): Student[] {
  // Bivariate normal: test2 = correlation * test1 + sqrt(1 - r^2) * noise
  return Array.from({ length: n }, (_, i) => {
    const test1Raw = gaussRand();
    const noise = gaussRand();
    const test2Raw = correlation * test1Raw + Math.sqrt(1 - correlation ** 2) * noise;
    // Scale to 0-100
    const test1 = Math.max(0, Math.min(100, Math.round(50 + test1Raw * 15)));
    const test2 = Math.max(0, Math.min(100, Math.round(50 + test2Raw * 15)));
    return { id: i, name: NAMES[i % NAMES.length], test1, test2 };
  });
}

export function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
