"use client";

import React from "react";

export default function CausalExplainer() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Correlation */}
      <div className="rounded-2xl border border-[#3bb4a4]/30 bg-[#3bb4a4]/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <svg width="34" height="22" viewBox="0 0 34 22">
            <circle cx="9"  cy="11" r="8" fill="none" stroke="#3bb4a4" strokeWidth="2" />
            <circle cx="25" cy="11" r="8" fill="none" stroke="#3bb4a4" strokeWidth="2" />
          </svg>
          <p className="text-[14px] font-bold text-[#3bb4a4]">Correlation</p>
        </div>
        <p className="text-[12px] text-[#94a3b8] mb-3">Two variables move together — but neither necessarily causes the other.</p>
        <div className="rounded-lg bg-[#1e293b]/60 p-2.5 mb-3">
          <p className="text-[11px] font-mono text-[#3bb4a4]">Ice Cream Sales ↔ Shark Attacks</p>
          <p className="text-[10px] text-[#475569] mt-0.5">Bidirectional — no causal claim</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[22px] font-black text-[#3bb4a4]">↔</span>
          <span className="text-[11px] text-[#94a3b8]">Association only — direction unknown</span>
        </div>
      </div>

      {/* Causation */}
      <div className="rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <svg width="34" height="22" viewBox="0 0 34 22">
            <line x1="4" y1="11" x2="26" y2="11" stroke="#d4af37" strokeWidth="2" />
            <polygon points="26,6 33,11 26,16" fill="#d4af37" />
          </svg>
          <p className="text-[14px] font-bold text-[#d4af37]">Causation</p>
        </div>
        <p className="text-[12px] text-[#94a3b8] mb-3">One variable directly causes changes in another via a mechanism.</p>
        <div className="rounded-lg bg-[#1e293b]/60 p-2.5 mb-3">
          <p className="text-[11px] font-mono text-[#d4af37]">Temperature → Ice Cream Sales</p>
          <p className="text-[10px] text-[#475569] mt-0.5">Directional — mechanism exists</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[22px] font-black text-[#d4af37]">→</span>
          <span className="text-[11px] text-[#94a3b8]">A causes B through a real pathway</span>
        </div>
      </div>

      {/* Key note */}
      <div className="sm:col-span-2 rounded-xl border border-white/10 bg-[#1e293b]/30 p-3 text-center">
        <p className="text-[12px] text-[#94a3b8] leading-relaxed">
          <strong className="text-white">Key rule:</strong>{" "}
          Causation always implies correlation — but correlation does <em>not</em> imply causation.
        </p>
      </div>

      {/* Three common patterns */}
      <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { title: "Common Cause (Confounder)", desc: "A third variable Z causes both X and Y, creating a spurious correlation.", color: "#ef4444", symbol: "Z→X, Z→Y" },
          { title: "Reverse Causation",        desc: "You assume X→Y but actually Y→X. Classic in economics and medicine.", color: "#f97316", symbol: "Y→X (not X→Y)" },
          { title: "Mediation",                desc: "X causes Z which causes Y. The effect is indirect — but still causal.", color: "#3bb4a4", symbol: "X→Z→Y" },
        ].map(({ title, desc, color, symbol }) => (
          <div key={title} className="rounded-xl bg-[#1e293b]/40 border border-[#1e293b] p-3">
            <p className="text-[10px] font-semibold mb-0.5" style={{ color }}>{title}</p>
            <p className="text-[9px] font-mono text-[#d4af37] mb-1.5">{symbol}</p>
            <p className="text-[11px] text-[#94a3b8] leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
