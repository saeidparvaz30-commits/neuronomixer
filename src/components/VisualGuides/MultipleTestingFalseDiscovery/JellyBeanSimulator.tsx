"use client";

import React from "react";
import { motion } from "framer-motion";

const TEST_OPTIONS = [5, 10, 15, 20, 50] as const;
type NumTests = 5 | 10 | 15 | 20 | 50;

interface JellyBeanSimulatorProps {
  numberOfTests: NumTests;
  sampleSizePerTest: number;
  isRunning: boolean;
  onNumberOfTestsChange: (n: NumTests) => void;
  onSampleSizeChange: (n: number) => void;
  onRun: () => void;
  onTestsChanged: () => void;
}

export default function JellyBeanSimulator({
  numberOfTests,
  sampleSizePerTest,
  isRunning,
  onNumberOfTestsChange,
  onSampleSizeChange,
  onRun,
  onTestsChanged,
}: JellyBeanSimulatorProps) {
  const expectedFP = (numberOfTests * 0.05).toFixed(1);

  function handleTestsChange(n: NumTests) {
    onNumberOfTestsChange(n);
    onTestsChanged();
  }

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">
        Jelly Bean Study
      </p>

      {/* Scenario context */}
      <div className="rounded-xl border border-[#1e293b] bg-[#1e293b]/40 p-3 mb-5">
        <p className="text-[12px] text-[#94a3b8] leading-relaxed">
          A researcher tests whether eating jelly beans of each of{" "}
          <span className="text-[#d4af37] font-semibold">{numberOfTests} colors</span> is
          associated with acne. Each test compares an acne rate between a jelly-bean group
          and a control group — but{" "}
          <span className="text-white font-semibold">there is no real effect</span>. All
          differences are pure noise.
        </p>
      </div>

      {/* Number of tests */}
      <div className="mb-5">
        <p className="text-[11px] text-white mb-2">Number of jelly bean colors tested (M)</p>
        <div className="flex flex-wrap gap-2">
          {TEST_OPTIONS.map(n => (
            <button
              key={n}
              onClick={() => handleTestsChange(n)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                numberOfTests === n
                  ? "bg-[#d4af37] text-[#0a0e1a]"
                  : "border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37]"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Sample size slider */}
      <div className="mb-5">
        <div className="flex justify-between mb-1">
          <span className="text-[11px] text-white">Sample size per test (n)</span>
          <span className="text-[11px] font-mono text-[#d4af37]">{sampleSizePerTest}</span>
        </div>
        <input
          type="range"
          min={30}
          max={200}
          step={5}
          value={sampleSizePerTest}
          onChange={e => onSampleSizeChange(Number(e.target.value))}
          className="w-full"
          style={{ accentColor: "#d4af37" }}
        />
        <div className="flex justify-between mt-0.5">
          <span className="text-[10px] text-[#475569]">30</span>
          <span className="text-[10px] text-[#475569]">200</span>
        </div>
      </div>

      {/* Expected FP formula */}
      <div className="rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/5 p-3 mb-5">
        <p className="text-[11px] text-[#94a3b8] mb-1">Expected false positives under H₀:</p>
        <p className="text-[13px] font-mono text-white">
          M × α = {numberOfTests} × 0.05 ={" "}
          <span className="text-[#d4af37] font-bold">{expectedFP}</span>
        </p>
        <p className="text-[11px] text-[#475569] mt-1">
          Even with no real effect, we expect ~{expectedFP} tests to appear significant by chance.
        </p>
      </div>

      {/* Run button */}
      <motion.button
        onClick={onRun}
        disabled={isRunning}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="w-full py-2.5 rounded-xl text-[13px] font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {isRunning ? "Simulating…" : "Run Simulation"}
      </motion.button>
    </div>
  );
}
