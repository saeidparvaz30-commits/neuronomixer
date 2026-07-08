import { FilterDefinition } from "./types";

export const FILTERS: FilterDefinition[] = [
  {
    id: "edge-h",
    label: "Horizontal Edge",
    color: "#3bb4a4",
    kernel: [[-1, -1, -1], [0, 0, 0], [1, 1, 1]],
    description: "Detects horizontal boundaries where pixel brightness changes top-to-bottom.",
    detectsWhat: "Horizontal lines & edges",
    layerDepth: "early",
  },
  {
    id: "edge-v",
    label: "Vertical Edge",
    color: "#1e5d8a",
    kernel: [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]],
    description: "Detects vertical boundaries where pixel brightness changes left-to-right.",
    detectsWhat: "Vertical lines & edges",
    layerDepth: "early",
  },
  {
    id: "edge-both",
    label: "All Edges (Laplacian)",
    color: "#a855f7",
    kernel: [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]],
    description: "Detects all edges in all directions simultaneously.",
    detectsWhat: "All edges & corners",
    layerDepth: "early",
  },
  {
    id: "sharpen",
    label: "Sharpen",
    color: "#d4af37",
    kernel: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]],
    description: "Enhances fine details by amplifying differences between a pixel and its neighbors.",
    detectsWhat: "Fine textures & detail",
    layerDepth: "mid",
  },
  {
    id: "blur",
    label: "Gaussian Blur",
    color: "#94a3b8",
    kernel: [[1, 2, 1], [2, 4, 2], [1, 2, 1]], // normalized by /16
    description: "Smooths the image by averaging each pixel with its neighbors. Removes noise.",
    detectsWhat: "Smooth regions & noise reduction",
    layerDepth: "mid",
  },
  {
    id: "emboss",
    label: "Emboss",
    color: "#ec4899",
    kernel: [[-2, -1, 0], [-1, 1, 1], [0, 1, 2]],
    description: "Creates a 3D raised effect, highlighting depth and direction of edges.",
    detectsWhat: "Depth & directionality",
    layerDepth: "mid",
  },
];
