"use client";

interface DropoutRateSliderProps {
  value: number;
  onChange: (v: number) => void;
}

function getRateColor(rate: number): string {
  if (rate < 0.3) return "#22c55e"; // green
  if (rate < 0.6) return "#eab308"; // yellow
  return "#ef4444"; // red
}

function getRateLabel(rate: number): string | null {
  if (rate === 0) return "No dropout";
  if (rate === 0.5) return "Recommended";
  if (rate >= 0.9) return "Too aggressive";
  return null;
}

export default function DropoutRateSlider({ value, onChange }: DropoutRateSliderProps) {
  const pct = Math.round(value * 100);
  const color = getRateColor(value);
  const label = getRateLabel(value);

  return (
    <div className="bg-[#1e293b]/60 border border-white/[0.07] rounded-2xl p-6">
      {/* Big rate display */}
      <div className="flex items-end gap-3 mb-5">
        <span className="text-5xl font-black" style={{ color }}>
          p = {value.toFixed(2)}
        </span>
        {label && (
          <span
            className="mb-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border"
            style={{ color, borderColor: color, background: `${color}18` }}
          >
            {label}
          </span>
        )}
      </div>

      {/* Subtitle */}
      <p className="text-sm text-[#94a3b8] mb-5">
        <span style={{ color }} className="font-semibold">
          {pct}%
        </span>{" "}
        of neurons will be dropped during each training step
      </p>

      {/* Slider */}
      <div className="relative mb-4">
        <input
          type="range"
          min={0}
          max={0.9}
          step={0.05}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${color} ${(value / 0.9) * 100}%, #1e293b ${(value / 0.9) * 100}%)`,
          }}
        />
      </div>

      {/* Tick labels */}
      <div className="flex justify-between text-[10px] text-[#475569] font-medium">
        <span>0<br /><span className="text-[#22c55e]">None</span></span>
        <span className="text-center">0.1–0.2<br /><span className="text-[#64748b]">Input</span></span>
        <span className="text-center">0.5<br /><span className="text-[#eab308]">Hidden</span></span>
        <span className="text-right">0.9<br /><span className="text-[#ef4444]">Too high</span></span>
      </div>

      {/* Info pills */}
      <div className="mt-5 flex flex-wrap gap-2">
        {[
          { range: "0.0–0.2", label: "Input layers", color: "#22c55e" },
          { range: "0.3–0.5", label: "Hidden layers (standard)", color: "#eab308" },
          { range: "0.5", label: "Most common default", color: "#3bb4a4" },
        ].map(({ range, label: l, color: c }) => (
          <div
            key={range}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px]"
            style={{ borderColor: `${c}30`, background: `${c}10`, color: c }}
          >
            <span className="font-semibold">{range}</span>
            <span className="text-white/50">·</span>
            <span>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
