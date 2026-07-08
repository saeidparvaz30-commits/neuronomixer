"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import type { TreeData, TreeNodeData, TreeBranchData, HighlightedPath } from "./types";
import TreeNode from "./TreeNode";

// ── Layout constants ──────────────────────────────────────────────────────────

const LEVEL_Y: Record<number, number> = { 0: 30, 1: 120, 2: 220 };
const SVG_WIDTH = 540;
const SVG_HEIGHT = 300;
const HORIZONTAL_PADDING = 60;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getX(node: TreeNodeData): number {
  const usable = SVG_WIDTH - HORIZONTAL_PADDING * 2;
  if (node.siblingCount === 1) return SVG_WIDTH / 2;
  return HORIZONTAL_PADDING + (node.siblingIndex / (node.siblingCount - 1)) * usable;
}

function getY(node: TreeNodeData): number {
  return LEVEL_Y[node.level] ?? 30 + node.level * 90;
}

function buildPathFromLeaf(nodeId: string, nodes: TreeNodeData[], branches: TreeBranchData[]): HighlightedPath {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const highlightedNodes: string[] = [nodeId];
  const highlightedBranches: string[] = [];

  let currentId = nodeId;
  while (true) {
    const branch = branches.find((b) => b.toNodeId === currentId);
    if (!branch) break;
    highlightedBranches.push(branch.id);
    highlightedNodes.push(branch.fromNodeId);
    currentId = branch.fromNodeId;
  }

  // Build calculation string
  const pathNodes = [...highlightedNodes].reverse().map((id) => nodeMap.get(id));
  const probs = highlightedBranches
    .map((bid) => {
      const b = branches.find((br) => br.id === bid);
      return b?.fractionLabel ?? b?.probability ?? "";
    })
    .reverse();

  const nodeLabels = pathNodes.map((n) => n?.label ?? "").filter(Boolean);
  const leafNode = nodeMap.get(nodeId);
  const jointProb = leafNode?.jointProbability ?? "";

  const calculation =
    probs.length > 0
      ? `P(${nodeLabels.slice(1).join(" → ")}) = ${probs.join(" × ")}${jointProb ? ` = ${jointProb}` : ""}`
      : `P(${nodeLabels[0]}) = 1`;

  return {
    nodeIds: highlightedNodes,
    branchIds: highlightedBranches,
    calculation,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface TreeBuilderProps {
  tree: TreeData;
  selectedNodeId: string | null;
  onNodeClick: (nodeId: string) => void;
}

export default function TreeBuilder({ tree, selectedNodeId, onNodeClick }: TreeBuilderProps) {
  const { nodes, branches } = tree;

  const highlighted = useMemo<HighlightedPath | null>(() => {
    if (!selectedNodeId) return null;
    return buildPathFromLeaf(selectedNodeId, nodes, branches);
  }, [selectedNodeId, nodes, branches]);

  const nodeCoords = useMemo(() => {
    return new Map(nodes.map((n) => [n.id, { x: getX(n), y: getY(n) }]));
  }, [nodes]);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        width="100%"
        className="block max-w-full"
        style={{ minWidth: 300, maxHeight: 320 }}
        aria-label="Probability tree diagram"
      >
        {/* Branches */}
        {branches.map((branch) => {
          const from = nodeCoords.get(branch.fromNodeId);
          const to = nodeCoords.get(branch.toNodeId);
          if (!from || !to) return null;

          const isOnPath = highlighted?.branchIds.includes(branch.id) ?? false;
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;

          return (
            <motion.g
              key={branch.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.3 }}
            >
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={isOnPath ? "var(--color-accent)" : "#334155"}
                strokeWidth={isOnPath ? 2.5 : 1.5}
                strokeLinecap="round"
              />
              {/* Probability label on branch */}
              <text
                x={midX}
                y={midY - 7}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={9}
                fontWeight="600"
                fill={isOnPath ? "var(--color-accent)" : "#94a3b8"}
                style={{ userSelect: "none" }}
              >
                {branch.fractionLabel ?? branch.probability}
              </text>
            </motion.g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node, i) => {
          const coords = nodeCoords.get(node.id);
          if (!coords) return null;
          const isSelected = selectedNodeId === node.id;
          const isOnPath = highlighted?.nodeIds.includes(node.id) ?? false;
          // Stagger by level then sibling index
          const delay = node.level * 0.12 + node.siblingIndex * 0.06;

          return (
            <TreeNode
              key={node.id}
              node={node}
              cx={coords.x}
              cy={coords.y}
              isSelected={isSelected}
              isOnPath={isOnPath}
              animDelay={delay}
              onClick={onNodeClick}
            />
          );
        })}
      </svg>

      {/* Path calculation badge */}
      {highlighted && (
        <motion.div
          key={highlighted.calculation}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 px-3 py-2 rounded-xl bg-[#1e293b] border border-[var(--color-accent)]/20 text-[11px] text-[var(--color-accent)] font-mono leading-relaxed"
        >
          {highlighted.calculation}
        </motion.div>
      )}

      {!selectedNodeId && (
        <p className="mt-2 text-[11px] text-[#475569] text-center">
          Click any node to highlight the path and see the calculation
        </p>
      )}
    </div>
  );
}
