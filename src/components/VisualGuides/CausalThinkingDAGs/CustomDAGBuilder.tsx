"use client";

import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuideMotion } from "@/lib/guideMotion";
import { DAGNode, DAGEdge } from "./types";

type BuildMode = "add" | "connect" | "delete";

const NODE_R = 40;
const CANVAS_W = 600;
const CANVAS_H = 340;

const ROLE_OPTIONS: Array<{ value: DAGNode["role"]; label: string; color: string }> = [
  { value: "treatment",  label: "Treatment",  color: "#1e5d8a" },
  { value: "outcome",    label: "Outcome",    color: "#3bb4a4" },
  { value: "confounder", label: "Confounder", color: "#d4af37" },
  { value: "mediator",   label: "Mediator",   color: "#a855f7" },
  { value: "collider",   label: "Collider",   color: "#ef4444" },
  { value: "cause",      label: "Cause",      color: "#64748b" },
];

function getRoleColor(role: DAGNode["role"]): string {
  return ROLE_OPTIONS.find((r) => r.value === role)?.color ?? "#64748b";
}

let nodeCounter = 0;
let edgeCounter = 0;

function uniqueNodeId() { return `n${++nodeCounter}`; }
function uniqueEdgeId() { return `e${++edgeCounter}`; }

interface AddNodeOverlay {
  x: number;
  y: number;
  svgX: number;
  svgY: number;
}

export default function CustomDAGBuilder() {
  const { fadeUp, fadeIn, pop } = useGuideMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const [mode, setMode] = useState<BuildMode>("add");
  const [nodes, setNodes] = useState<DAGNode[]>([]);
  const [edges, setEdges] = useState<DAGEdge[]>([]);
  const [pendingSource, setPendingSource] = useState<string | null>(null);
  const [addOverlay, setAddOverlay] = useState<AddNodeOverlay | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newRole, setNewRole] = useState<DAGNode["role"]>("cause");
  const [feedback, setFeedback] = useState<string>("");

  // ── SVG coordinate conversion ─────────────────────────────────────────────
  function getSVGCoords(e: React.MouseEvent<SVGSVGElement>): { x: number; y: number } {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  // ── Canvas click ──────────────────────────────────────────────────────────
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (mode !== "add") return;
      // Make sure we clicked on the canvas background, not a node
      if ((e.target as SVGElement).closest(".dag-node")) return;

      const { x, y } = getSVGCoords(e);
      const rect = svgRef.current!.getBoundingClientRect();
      // Overlay position in screen px (centered on click)
      const scaleX = rect.width / CANVAS_W;
      const scaleY = rect.height / CANVAS_H;
      setAddOverlay({
        x: rect.left + x * scaleX,
        y: rect.top + y * scaleY,
        svgX: x,
        svgY: y,
      });
      setNewLabel("");
      setNewRole("cause");
    },
    [mode]
  );

  // ── Confirm add node ──────────────────────────────────────────────────────
  function confirmAddNode() {
    if (!addOverlay || !newLabel.trim()) return;
    const id = uniqueNodeId();
    setNodes((prev) => [
      ...prev,
      {
        id,
        label: newLabel.trim(),
        role: newRole,
        x: Math.max(NODE_R + 4, Math.min(CANVAS_W - NODE_R - 4, addOverlay.svgX)),
        y: Math.max(NODE_R + 4, Math.min(CANVAS_H - NODE_R - 4, addOverlay.svgY)),
        color: getRoleColor(newRole),
      },
    ]);
    setAddOverlay(null);
    setFeedback(`Added node "${newLabel.trim()}"`);
    setTimeout(() => setFeedback(""), 2000);
  }

  // ── Node click (connect/delete mode) ─────────────────────────────────────
  function handleNodeClick(e: React.MouseEvent, nodeId: string) {
    e.stopPropagation();
    if (mode === "delete") {
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setPendingSource(null);
      setFeedback("Node deleted");
      setTimeout(() => setFeedback(""), 2000);
      return;
    }
    if (mode === "connect") {
      if (pendingSource === null) {
        setPendingSource(nodeId);
        const n = nodes.find((n) => n.id === nodeId);
        setFeedback(`Source: "${n?.label}". Now click the target node`);
        return;
      }
      if (pendingSource === nodeId) {
        setPendingSource(null);
        setFeedback("Cancelled: can't connect a node to itself");
        setTimeout(() => setFeedback(""), 2000);
        return;
      }
      // Check duplicate
      const exists = edges.some(
        (e) => e.source === pendingSource && e.target === nodeId
      );
      if (exists) {
        setPendingSource(null);
        setFeedback("Edge already exists between these nodes");
        setTimeout(() => setFeedback(""), 2000);
        return;
      }
      // Reject cycles: if the target can already reach the source, adding
      // source -> target would create a loop, and DAGs are acyclic.
      const reachable = new Set<string>();
      const stack = [nodeId];
      while (stack.length > 0) {
        const cur = stack.pop()!;
        if (reachable.has(cur)) continue;
        reachable.add(cur);
        for (const ed of edges) {
          if (ed.source === cur) stack.push(ed.target);
        }
      }
      if (reachable.has(pendingSource)) {
        setPendingSource(null);
        setFeedback("Rejected: that arrow would create a cycle. DAGs are acyclic (the A in DAG)");
        setTimeout(() => setFeedback(""), 3000);
        return;
      }
      const id = uniqueEdgeId();
      setEdges((prev) => [...prev, { id, source: pendingSource, target: nodeId }]);
      setPendingSource(null);
      const src = nodes.find((n) => n.id === pendingSource);
      const tgt = nodes.find((n) => n.id === nodeId);
      setFeedback(`Arrow: "${src?.label}" → "${tgt?.label}"`);
      setTimeout(() => setFeedback(""), 2500);
    }
  }

  // ── Edge click (delete mode) ──────────────────────────────────────────────
  function handleEdgeClick(e: React.MouseEvent, edgeId: string) {
    e.stopPropagation();
    if (mode !== "delete") return;
    setEdges((prev) => prev.filter((ed) => ed.id !== edgeId));
    setFeedback("Edge deleted");
    setTimeout(() => setFeedback(""), 2000);
  }

  // ── Edge rendering helper ─────────────────────────────────────────────────
  function renderEdge(edge: DAGEdge) {
    const src = nodes.find((n) => n.id === edge.source);
    const tgt = nodes.find((n) => n.id === edge.target);
    if (!src || !tgt) return null;

    const dx = tgt.x - src.x;
    const dy = tgt.y - src.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const sx = src.x + (dx / dist) * (NODE_R + 2);
    const sy = src.y + (dy / dist) * (NODE_R + 2);
    const ex = tgt.x - (dx / dist) * (NODE_R + 8);
    const ey = tgt.y - (dy / dist) * (NODE_R + 8);

    return (
      <g key={edge.id} className="dag-edge" onClick={(e) => handleEdgeClick(e, edge.id)}>
        {/* Invisible wider hit area */}
        <line
          x1={sx} y1={sy} x2={ex} y2={ey}
          stroke="transparent"
          strokeWidth={12}
          style={{ cursor: mode === "delete" ? "pointer" : "default" }}
        />
        <line
          x1={sx} y1={sy} x2={ex} y2={ey}
          stroke="#94a3b8"
          strokeWidth={2}
          markerEnd="url(#custom-arrow)"
          style={{ pointerEvents: "none" }}
        />
      </g>
    );
  }

  // ── Node rendering ────────────────────────────────────────────────────────
  function renderNode(node: DAGNode) {
    const isPendingSource = pendingSource === node.id;
    const isDeleteMode = mode === "delete";
    const isConnectMode = mode === "connect";

    return (
      <g
        key={node.id}
        className="dag-node"
        onClick={(e) => handleNodeClick(e, node.id)}
        style={{
          cursor:
            isDeleteMode ? "pointer" :
            isConnectMode ? "pointer" :
            "default",
        }}
      >
        {isPendingSource && (
          <circle
            cx={node.x} cy={node.y} r={NODE_R + 8}
            fill="none"
            stroke="#3bb4a4"
            strokeWidth={2}
            strokeDasharray="5 3"
            opacity={0.8}
          />
        )}
        <circle
          cx={node.x}
          cy={node.y}
          r={NODE_R}
          fill={isDeleteMode ? "#7f1d1d" : isPendingSource ? "#0c4a3a" : node.color}
          stroke={isDeleteMode ? "#ef4444" : isPendingSource ? "#3bb4a4" : node.color}
          strokeWidth={isPendingSource ? 2.5 : 1.5}
          opacity={0.9}
        />
        {node.label.split(" ").map((word, i, arr) => (
          <text
            key={i}
            x={node.x}
            y={node.y + (i - (arr.length - 1) / 2) * 20}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="19"
            fontWeight="600"
            fill="#f1f5f9"
            style={{ pointerEvents: "none" }}
          >
            {word}
          </text>
        ))}
      </g>
    );
  }

  // ── Clear canvas ──────────────────────────────────────────────────────────
  function clearCanvas() {
    setNodes([]);
    setEdges([]);
    setPendingSource(null);
    setAddOverlay(null);
    setFeedback("Canvas cleared");
    setTimeout(() => setFeedback(""), 2000);
  }

  const MODE_BUTTONS: Array<{ id: BuildMode; label: string; icon: string; hint: string }> = [
    { id: "add",     label: "Add Node",    icon: "+", hint: "Click anywhere on the canvas to add a node" },
    { id: "connect", label: "Draw Arrow",  icon: "→", hint: "Click a source node, then a target node" },
    { id: "delete",  label: "Delete",      icon: "✕", hint: "Click any node or arrow to delete it" },
  ];

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-white mb-1">Build Your Own DAG</h3>
        <p className="text-sm text-[#94a3b8]">
          Create your own causal diagram. Add nodes, draw arrows between them, and experiment with different structures.
        </p>
      </div>

      {/* Mode toolbar */}
      <div className="flex items-center gap-2 flex-wrap" role="radiogroup" aria-label="Builder mode">
        {MODE_BUTTONS.map((btn) => (
          <button
            key={btn.id}
            role="radio"
            aria-checked={mode === btn.id}
            onClick={() => { setMode(btn.id); setPendingSource(null); setAddOverlay(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
              mode === btn.id
                ? btn.id === "delete"
                  ? "bg-red-500/20 border-red-500/50 text-red-300"
                  : btn.id === "connect"
                  ? "bg-[#3bb4a4]/20 border-[#3bb4a4]/50 text-[#3bb4a4]"
                  : "bg-[#d4af37]/20 border-[#d4af37]/50 text-[var(--color-accent)]"
                : "bg-[#1e293b] border-[#334155] text-[#94a3b8] hover:text-white hover:border-[#475569]"
            }`}
          >
            <span className="text-base leading-none">{btn.icon}</span>
            <span>{btn.label}</span>
          </button>
        ))}
        <div className="flex-1" />
        {(nodes.length > 0 || edges.length > 0) && (
          <button
            onClick={clearCanvas}
            className="px-3 py-2 rounded-xl text-xs text-[#94a3b8] border border-[#1e293b] hover:border-red-500/40 hover:text-red-400 transition-all"
          >
            Clear canvas
          </button>
        )}
      </div>

      {/* Mode hint */}
      <p className="text-[11px] text-[#475569] -mt-2 italic">
        {MODE_BUTTONS.find((b) => b.id === mode)?.hint}
        {mode === "connect" && pendingSource && (
          <span className="text-[#3bb4a4]"> (source selected, click target)</span>
        )}
      </p>

      {/* SVG canvas */}
      <div className="relative bg-[#0a0e1a] rounded-xl border border-[#1e293b] overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          className="w-full"
          style={{ maxHeight: CANVAS_H, cursor: mode === "add" ? "crosshair" : "default" }}
          onClick={handleCanvasClick}
        >
          <defs>
            <marker
              id="custom-arrow"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
            </marker>
          </defs>

          {/* Grid dots */}
          {Array.from({ length: 12 }, (_, row) =>
            Array.from({ length: 20 }, (_, col) => (
              <circle
                key={`${row}-${col}`}
                cx={col * 32 + 16}
                cy={row * 28 + 16}
                r={1}
                fill="#1e293b"
              />
            ))
          )}

          {/* Empty state text */}
          {nodes.length === 0 && (
            <text
              x={CANVAS_W / 2}
              y={CANVAS_H / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="19"
              fill="#334155"
              fontStyle="italic"
            >
              Click anywhere to add your first node
            </text>
          )}

          {/* Edges */}
          {edges.map(renderEdge)}

          {/* Nodes */}
          {nodes.map(renderNode)}
        </svg>

        {/* Add node overlay form */}
        <AnimatePresence>
          {addOverlay && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setAddOverlay(null)}
              />
              <motion.div
                variants={pop}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="fixed z-50 bg-[#1e293b] border border-[#334155] rounded-xl shadow-2xl p-4 w-72"
                style={{
                  left: Math.min(addOverlay.x, window.innerWidth - 290),
                  top: Math.max(8, addOverlay.y - 120),
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-xs font-semibold text-[#94a3b8] mb-3 uppercase tracking-wider">
                  New Node
                </p>
                <input
                  autoFocus
                  type="text"
                  placeholder="Node label…"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") confirmAddNode(); if (e.key === "Escape") setAddOverlay(null); }}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-sm text-white placeholder-[#475569] focus:outline-none focus:border-[#3bb4a4] mb-3"
                  maxLength={20}
                />
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as DAGNode["role"])}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-sm text-white mb-3 focus:outline-none focus:border-[#3bb4a4]"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={confirmAddNode}
                    disabled={!newLabel.trim()}
                    className="flex-1 bg-[var(--color-accent)] text-[#0a0e1a] rounded-lg py-1.5 text-sm font-bold disabled:opacity-40 hover:opacity-90 transition-opacity"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setAddOverlay(null)}
                    className="flex-1 border border-[#334155] text-[#94a3b8] rounded-lg py-1.5 text-sm hover:text-white hover:border-[#475569] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Feedback toast */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="text-xs text-[#3bb4a4] bg-[#3bb4a4]/10 border border-[#3bb4a4]/20 rounded-lg px-3 py-2"
          >
            {feedback}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Node list */}
      {nodes.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] text-[#475569] uppercase tracking-wider font-semibold">
            Nodes ({nodes.length}) · Edges ({edges.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {nodes.map((node) => (
              <div
                key={node.id}
                className="flex items-center gap-1.5 bg-[#1e293b] border border-[#334155] rounded-full px-2.5 py-1"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: node.color }}
                />
                <span className="text-xs text-white font-medium">{node.label}</span>
                <span className="text-[9px] text-[#475569]">({node.role})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role legend */}
      <div className="bg-[#0a0e1a] rounded-xl border border-[#1e293b] p-4">
        <p className="text-[11px] text-[#475569] uppercase tracking-wider font-semibold mb-3">
          Node role guide
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ROLE_OPTIONS.map((role) => (
            <div key={role.value} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: role.color }}
              />
              <span className="text-xs text-[#94a3b8]">{role.label}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
