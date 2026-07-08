"use client";

import React from "react";
import { type CompoundEvent, type SimState } from "./types";
import EventBuilder from "./EventBuilder";
import TheoreticalCalculator from "./TheoreticalCalculator";
import SimulationRunner from "./SimulationRunner";
import ResultsPanel from "./ResultsPanel";

interface EventSandboxProps {
  event: CompoundEvent;
  sim: SimState;
  onEventChange: (updated: CompoundEvent) => void;
  onEventReset: () => void;
  onSimUpdate: (updated: SimState) => void;
  onSimComplete: () => void;
  totalTrials: number;
}

export default function EventSandbox({
  event,
  sim,
  onEventChange,
  onEventReset,
  onSimUpdate,
  onSimComplete,
  totalTrials,
}: EventSandboxProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Event Builder */}
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[2px] text-[var(--color-accent)] mb-4">
            Event Builder
          </p>
          <EventBuilder
            event={event}
            onChange={onEventChange}
            onReset={onEventReset}
          />
        </div>

        {/* Right: Theoretical Calculator */}
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[2px] text-[var(--color-accent)] mb-4">
            Theoretical Probability
          </p>
          <TheoreticalCalculator event={event} />
        </div>
      </div>

      {/* Simulation Runner */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[2px] text-[var(--color-accent)] mb-4">
          Simulation
        </p>
        <SimulationRunner
          event={event}
          sim={sim}
          onSimUpdate={onSimUpdate}
          onSimComplete={onSimComplete}
        />
      </div>

      {/* Results Panel */}
      {sim.completed && (
        <ResultsPanel
          sim={sim}
          theoretical={event.theoretical}
          totalTrials={totalTrials}
        />
      )}
    </div>
  );
}
