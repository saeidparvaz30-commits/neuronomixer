"use client";

import React from "react";
import {
  GroupData,
  mean,
  stdDev,
  getDefaultGroups,
  PRESET_ALL_EQUAL,
  PRESET_STRONG_DIFF,
  PRESET_HIGH_VARIANCE,
} from "./types";

type PresetKey = "default" | "strong" | "equal" | "highVar";

const PRESETS: Record<PresetKey, { label: string; getData: () => GroupData[] }> = {
  default: { label: "Default (slight differences)", getData: getDefaultGroups },
  strong: { label: "Strong Differences (means far apart)", getData: () => PRESET_STRONG_DIFF.map(g => ({ ...g, values: [...g.values] })) },
  equal: { label: "All Equal", getData: () => PRESET_ALL_EQUAL.map(g => ({ ...g, values: [...g.values] })) },
  highVar: { label: "High Variance Within", getData: () => PRESET_HIGH_VARIANCE.map(g => ({ ...g, values: [...g.values] })) },
};

interface DataBuilderProps {
  groups: GroupData[];
  onGroupsChange: (groups: GroupData[]) => void;
}

export default function DataBuilder({ groups, onGroupsChange }: DataBuilderProps) {
  const [selectedPreset, setSelectedPreset] = React.useState<PresetKey>("default");

  function handlePresetChange(key: PresetKey) {
    setSelectedPreset(key);
    onGroupsChange(PRESETS[key].getData());
  }

  function handleReset() {
    setSelectedPreset("default");
    onGroupsChange(getDefaultGroups());
  }

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[13px] font-semibold text-white uppercase tracking-wider">
          Dataset
        </h2>
        <button
          onClick={handleReset}
          className="text-[11px] text-[#475569] hover:text-[#94a3b8] transition-colors"
        >
          Reset to Default
        </button>
      </div>

      {/* Preset selector */}
      <div className="mb-5">
        <label className="block text-[11px] text-[#94a3b8] mb-1.5 uppercase tracking-wider">
          Load Preset
        </label>
        <select
          value={selectedPreset}
          onChange={e => handlePresetChange(e.target.value as PresetKey)}
          className="w-full bg-[#1e293b] border border-[#334155] text-white text-[13px] rounded-xl px-3 py-2 focus:outline-none focus:border-[var(--color-accent)] transition-colors"
        >
          {(Object.entries(PRESETS) as [PresetKey, typeof PRESETS[PresetKey]][]).map(([key, { label }]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Group summary table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-[#1e293b]">
              <th className="text-left py-2 pr-3 text-[#94a3b8] font-medium">Group</th>
              <th className="text-right py-2 px-3 text-[#94a3b8] font-medium">N</th>
              <th className="text-right py-2 px-3 text-[#94a3b8] font-medium">Mean</th>
              <th className="text-right py-2 pl-3 text-[#94a3b8] font-medium">SD</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(g => {
              const m = mean(g.values);
              const sd = stdDev(g.values);
              return (
                <tr key={g.groupName} className="border-b border-[#1e293b]/50">
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: g.color }}
                      />
                      <span className="text-white">{g.groupName}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right text-[#94a3b8]">{g.values.length}</td>
                  <td className="py-2 px-3 text-right font-mono text-white">{m.toFixed(2)}</td>
                  <td className="py-2 pl-3 text-right font-mono text-[#94a3b8]">{sd.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-[#334155] mt-3">
        Each group has {groups[0]?.values.length ?? 0} observations. Select a preset to change the dataset.
      </p>
    </div>
  );
}
