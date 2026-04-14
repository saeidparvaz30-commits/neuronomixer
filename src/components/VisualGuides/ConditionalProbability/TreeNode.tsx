"use client";

import React from "react";
import { motion } from "framer-motion";
import type { TreeNodeData } from "./types";

interface TreeNodeProps {
  node: TreeNodeData;
  cx: number;
  cy: number;
  isSelected: boolean;
  isOnPath: boolean;
  animDelay: number;
  onClick: (id: string) => void;
}

const NODE_RADIUS = 22;
const LEAF_RADIUS = 26;

export default function TreeNode({
  node,
  cx,
  cy,
  isSelected,
  isOnPath,
  animDelay,
  onClick,
}: TreeNodeProps) {
  const r = node.isLeaf ? LEAF_RADIUS : NODE_RADIUS;
  const opacity = isSelected ? 1 : isOnPath ? 0.9 : 1;
  const strokeWidth = isSelected ? 3 : isOnPath ? 2.5 : 1.5;
  const strokeColor = isSelected
    ? "#d4af37"
    : isOnPath
    ? node.color
    : `${node.color}60`;

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity, scale: 1 }}
      transition={{ delay: animDelay, duration: 0.35, type: "spring", stiffness: 300, damping: 22 }}
      style={{ cursor: "pointer" }}
      onClick={() => onClick(node.id)}
      role="button"
      aria-label={`Node: ${node.label}`}
    >
      {/* Glow when selected */}
      {isSelected && (
        <circle
          cx={cx}
          cy={cy}
          r={r + 6}
          fill={node.color}
          opacity={0.15}
        />
      )}

      {/* Main circle */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={node.level === 0 ? "#1e293b" : node.color}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        opacity={node.level === 0 ? 1 : 0.92}
      />

      {/* Inner fill for leaf nodes to distinguish them */}
      {node.isLeaf && (
        <circle
          cx={cx}
          cy={cy}
          r={r - 4}
          fill={node.color}
          opacity={0.25}
        />
      )}

      {/* Main label */}
      <text
        x={cx}
        y={cy + (node.sublabel ? -4 : 4)}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={node.level === 0 ? 10 : 9}
        fontWeight="700"
        fill={node.level === 0 ? "#f1f5f9" : "#0f172a"}
        style={{ userSelect: "none", pointerEvents: "none" }}
      >
        {node.label}
      </text>

      {/* Sub-label (probability) */}
      {node.sublabel && (
        <text
          x={cx}
          y={cy + 8}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={7.5}
          fontWeight="600"
          fill={node.level === 0 ? "#94a3b8" : "#0f172a"}
          opacity={0.85}
          style={{ userSelect: "none", pointerEvents: "none" }}
        >
          {node.sublabel}
        </text>
      )}

      {/* Joint probability label below leaf */}
      {node.isLeaf && node.jointProbability && (
        <text
          x={cx}
          y={cy + r + 12}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={8}
          fontWeight="600"
          fill={node.color}
          style={{ userSelect: "none", pointerEvents: "none" }}
        >
          {node.jointProbability}
        </text>
      )}
    </motion.g>
  );
}
