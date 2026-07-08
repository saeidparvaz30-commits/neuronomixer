import type { Neuron, Connection, NetworkConfig } from "./types";

// Seeded LCG random number generator for deterministic dropout patterns
function lcgRandom(seed: number): () => number {
  let state = seed >>> 0;
  return function () {
    // LCG parameters from Numerical Recipes
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

// Layer sizes: input=4, hidden1=6, hidden2=6, output=3
const LAYER_SIZES: Record<Neuron["layer"], number> = {
  input: 4,
  hidden1: 6,
  hidden2: 6,
  output: 3,
};

const LAYER_ORDER: Neuron["layer"][] = ["input", "hidden1", "hidden2", "output"];

// Deterministic weight based on neuron positions
function deterministicWeight(fromLayer: number, fromIdx: number, toIdx: number): number {
  const raw = Math.sin(fromLayer * 7.3 + fromIdx * 3.7 + toIdx * 5.1) * 0.85;
  return raw;
}

// Deterministic activation value based on position
function deterministicValue(layerIdx: number, neuronIdx: number, scale: number): number {
  const raw = (Math.sin(layerIdx * 4.2 + neuronIdx * 2.9) + 1) / 2;
  return Math.min(1, raw * scale);
}

export function generateNetwork(config: NetworkConfig): {
  neurons: Neuron[];
  connections: Connection[];
} {
  const rng = lcgRandom(config.seed + Math.floor(config.dropoutRate * 1000));

  const neurons: Neuron[] = [];
  const droppedIds = new Set<string>();

  LAYER_ORDER.forEach((layer, layerIdx) => {
    const count = LAYER_SIZES[layer];
    for (let i = 0; i < count; i++) {
      const id = `${layer}-${i}`;
      let active = true;

      if (config.mode === "training") {
        // Input layer: lower dropout (apply only if dropoutRate > 0.3)
        // Hidden layers: full dropout rate
        // Output layer: never dropout
        if (layer === "output") {
          active = true;
        } else if (layer === "input") {
          const inputRate = config.dropoutRate * 0.3;
          active = rng() >= inputRate;
        } else {
          active = rng() >= config.dropoutRate;
        }
      } else {
        // Inference: all active
        active = true;
      }

      if (!active) droppedIds.add(id);

      // In inference mode, scale values by (1 - dropoutRate)
      const scale = config.mode === "inference" ? (1 - config.dropoutRate) : 1;
      const value = active ? deterministicValue(layerIdx, i, scale) : 0;

      neurons.push({ id, layer, index: i, active, value });
    }
  });

  const connections: Connection[] = [];

  for (let li = 0; li < LAYER_ORDER.length - 1; li++) {
    const fromLayer = LAYER_ORDER[li];
    const toLayer = LAYER_ORDER[li + 1];
    const fromCount = LAYER_SIZES[fromLayer];
    const toCount = LAYER_SIZES[toLayer];

    for (let fi = 0; fi < fromCount; fi++) {
      for (let ti = 0; ti < toCount; ti++) {
        const fromId = `${fromLayer}-${fi}`;
        const toId = `${toLayer}-${ti}`;
        const visible = !droppedIds.has(fromId) && !droppedIds.has(toId);
        connections.push({
          from: fromId,
          to: toId,
          weight: deterministicWeight(li, fi, ti),
          visible,
        });
      }
    }
  }

  return { neurons, connections };
}

export function countActiveNeurons(
  neurons: Neuron[]
): { layer: string; active: number; total: number }[] {
  const result: { layer: string; active: number; total: number }[] = [];
  for (const layer of LAYER_ORDER) {
    const layerNeurons = neurons.filter((n) => n.layer === layer);
    result.push({
      layer,
      active: layerNeurons.filter((n) => n.active).length,
      total: layerNeurons.length,
    });
  }
  return result;
}
