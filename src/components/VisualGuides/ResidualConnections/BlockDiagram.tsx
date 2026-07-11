"use client";

/**
 * Illustrative SVG diagram of one residual block: the identity (skip) path
 * and the learned correction f(h) meeting at the addition node. No computed
 * numbers here; the interactive labs below carry the real math.
 */
export default function BlockDiagram() {
  return (
    <svg
      viewBox="0 0 640 190"
      className="w-full max-w-[640px] mx-auto block"
      role="img"
      aria-label="Diagram of a residual block: the input h splits into two paths. The lower identity path carries h unchanged to an addition node. The upper path passes h through the layers f of the block. The addition node outputs h plus f of h."
    >
      {/* Main path line */}
      <line x1="40" y1="130" x2="200" y2="130" stroke="#475569" strokeWidth="1.5" />
      <line x1="380" y1="130" x2="520" y2="130" stroke="#475569" strokeWidth="1.5" />
      <line x1="552" y1="130" x2="612" y2="130" stroke="#475569" strokeWidth="1.5" />

      {/* Skip path: input up, across, down into the + node */}
      <path
        d="M 120 130 L 120 50 L 536 50 L 536 114"
        fill="none"
        stroke="var(--color-success)"
        strokeWidth="2"
      />
      <polygon points="536,114 531,104 541,104" fill="var(--color-success)" />

      {/* Block box */}
      <rect
        x="200"
        y="98"
        width="180"
        height="64"
        rx="12"
        fill="#1e293b"
        stroke="#334155"
        strokeWidth="1"
      />
      <text x="290" y="126" textAnchor="middle" fill="#f1f5f9" fontSize="14" fontWeight="700">
        f(h)
      </text>
      <text x="290" y="146" textAnchor="middle" fill="#94a3b8" fontSize="10">
        linear, tanh, linear
      </text>

      {/* Plus node */}
      <circle cx="536" cy="130" r="16" fill="#0f172a" stroke="var(--color-accent)" strokeWidth="2" />
      <text x="536" y="135" textAnchor="middle" fill="var(--color-accent)" fontSize="16" fontWeight="700">
        +
      </text>

      {/* Arrowhead into block and out of + */}
      <polygon points="200,130 190,125 190,135" fill="#475569" />
      <polygon points="612,130 602,125 602,135" fill="#475569" />

      {/* Labels */}
      <text x="52" y="122" fill="#94a3b8" fontSize="13" fontWeight="600">
        h
      </text>
      <text x="328" y="42" textAnchor="middle" fill="var(--color-success)" fontSize="11" fontWeight="600">
        identity (skip connection): carries h through untouched
      </text>
      <text x="586" y="118" textAnchor="middle" fill="#94a3b8" fontSize="13" fontWeight="600">
        h + f(h)
      </text>
      <text x="290" y="180" textAnchor="middle" fill="#475569" fontSize="10">
        the block only learns the correction f(h), the residual
      </text>
    </svg>
  );
}
