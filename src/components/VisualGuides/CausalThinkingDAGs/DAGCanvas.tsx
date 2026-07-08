"use client";

import React from "react";
import { DAG, DAGNode, DAGEdge } from "./types";

const NODE_R = 30; // radius of each node circle

interface DAGCanvasProps {
  dag: DAG;
  controlled: Set<string>;
  width?: number;
  height?: number;
  onNodeClick?: (nodeId: string) => void;
}

function getCenter(node: DAGNode) {
  return { cx: node.x, cy: node.y };
}

/** Compute a point on the border of a circle (radius r) toward another point */
function borderPoint(from: { cx: number; cy: number }, to: { cx: number; cy: number }, r: number) {
  const dx = to.cx - from.cx;
  const dy = to.cy - from.cy;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  return {
    x: from.cx + (dx / dist) * (dist - r),
    y: from.cy + (dy / dist) * (dist - r),
  };
}

function startPoint(from: { cx: number; cy: number }, to: { cx: number; cy: number }, r: number) {
  const dx = to.cx - from.cx;
  const dy = to.cy - from.cy;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  return {
    x: from.cx + (dx / dist) * r,
    y: from.cy + (dy / dist) * r,
  };
}

function EdgeArrow({
  edge,
  nodes,
  controlled,
}: {
  edge: DAGEdge;
  nodes: DAGNode[];
  controlled: Set<string>;
}) {
  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);
  if (!sourceNode || !targetNode) return null;

  const from = getCenter(sourceNode);
  const to = getCenter(targetNode);

  // ── Association edges: dashed, undirected, appear/disappear with conditioning ──
  if (edge.association) {
    if (edge.showWhenControlled && !edge.showWhenControlled.every((id) => controlled.has(id))) {
      return null;
    }
    if (edge.hideWhenControlled && edge.hideWhenControlled.some((id) => controlled.has(id))) {
      return null;
    }
    const aStart = startPoint(from, to, NODE_R + 2);
    const aEnd = borderPoint(from, to, NODE_R + 2);
    const color = edge.associationColor ?? "var(--color-accent)";
    const midX = (aStart.x + aEnd.x) / 2;
    const midY = (aStart.y + aEnd.y) / 2;
    return (
      <g style={{ transition: "all 0.3s ease" }}>
        <line
          x1={aStart.x}
          y1={aStart.y}
          x2={aEnd.x}
          y2={aEnd.y}
          stroke={color}
          strokeWidth={2}
          strokeDasharray="6 3"
        />
        {edge.label && (
          <text
            x={midX}
            y={midY - 6}
            textAnchor="middle"
            fontSize="8"
            fill={color}
            style={{ pointerEvents: "none" }}
          >
            {edge.label}
          </text>
        )}
      </g>
    );
  }

  // ── Causal edges ──────────────────────────────────────────────────────────────
  const start = startPoint(from, to, NODE_R + 2);
  const end = borderPoint(from, to, NODE_R + 8); // extra for arrowhead

  // Fade only edges OUT OF a controlled node: conditioning on a variable stops
  // dependence from flowing THROUGH it (chain/fork). Edges INTO a controlled
  // node stay solid; in particular, conditioning on a collider does NOT block
  // its incoming causal arrows; it opens a path between its parents instead.
  const isBlocked = controlled.has(edge.source);

  const strokeColor = isBlocked ? "#334155" : "#94a3b8";

  return (
    <line
      x1={start.x}
      y1={start.y}
      x2={end.x}
      y2={end.y}
      stroke={strokeColor}
      strokeWidth={isBlocked ? 1 : 2}
      markerEnd="url(#arrow-normal)"
      opacity={isBlocked ? 0.3 : 1}
      style={{ transition: "all 0.3s ease" }}
    />
  );
}

function NodeCircle({
  node,
  isControlled,
  onClick,
}: {
  node: DAGNode;
  isControlled: boolean;
  onClick?: () => void;
}) {
  return (
    <g
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      {/* Glow ring when controlled */}
      {isControlled && (
        <circle
          cx={node.x}
          cy={node.y}
          r={NODE_R + 6}
          fill="none"
          stroke="#3bb4a4"
          strokeWidth={2}
          strokeDasharray="4 3"
          opacity={0.6}
        />
      )}
      {/* Node fill */}
      <circle
        cx={node.x}
        cy={node.y}
        r={NODE_R}
        fill={isControlled ? "#1e293b" : node.color}
        stroke={isControlled ? "#3bb4a4" : node.color}
        strokeWidth={isControlled ? 2 : 1.5}
        opacity={isControlled ? 0.7 : 1}
        style={{ transition: "all 0.3s ease" }}
      />
      {/* Label — split on spaces to wrap */}
      {node.label.split(" ").map((word, i, arr) => (
        <text
          key={i}
          x={node.x}
          y={node.y + (i - (arr.length - 1) / 2) * 13}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={arr.length > 1 ? "9" : "10"}
          fontWeight="600"
          fill={isControlled ? "#3bb4a4" : "#f1f5f9"}
          style={{ pointerEvents: "none", transition: "fill 0.3s ease" }}
        >
          {word}
        </text>
      ))}
      {/* "Controlled" badge */}
      {isControlled && (
        <>
          <rect
            x={node.x - 24}
            y={node.y + NODE_R + 4}
            width={48}
            height={14}
            rx={4}
            fill="#0f3d35"
            stroke="#3bb4a4"
            strokeWidth={0.5}
          />
          <text
            x={node.x}
            y={node.y + NODE_R + 11}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="7"
            fill="#3bb4a4"
            fontWeight="700"
            style={{ pointerEvents: "none" }}
          >
            CONTROLLED
          </text>
        </>
      )}
    </g>
  );
}

export default function DAGCanvas({
  dag,
  controlled,
  width = 480,
  height = 300,
  onNodeClick,
}: DAGCanvasProps) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ maxHeight: height }}
    >
      <defs>
        {/* Normal arrowhead */}
        <marker
          id="arrow-normal"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
        </marker>
        {/* Spurious arrowhead */}
        <marker
          id="arrow-spurious"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="var(--color-accent)" />
        </marker>
      </defs>

      {/* Edges */}
      {dag.edges.map((edge) => (
        <EdgeArrow
          key={edge.id}
          edge={edge}
          nodes={dag.nodes}
          controlled={controlled}
        />
      ))}

      {/* Nodes */}
      {dag.nodes.map((node) => (
        <NodeCircle
          key={node.id}
          node={node}
          isControlled={controlled.has(node.id)}
          onClick={onNodeClick ? () => onNodeClick(node.id) : undefined}
        />
      ))}
    </svg>
  );
}
