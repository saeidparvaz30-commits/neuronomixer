"use client";

import React from "react";
import { LOTTERY_TIERS, LOTTERY_TICKET_COST } from "./types";

export default function LotteryEVBreakdown() {
  const ticketCost = LOTTERY_TICKET_COST;

  // Compute EV contribution per tier (net gain × probability)
  const tiers = LOTTERY_TIERS.map((tier) => {
    const netGain = tier.prize - ticketCost;
    const evContrib = netGain * tier.probability;
    return { ...tier, netGain, evContrib };
  });

  // Add "no win" row
  const winProb = LOTTERY_TIERS.reduce((s, t) => s + t.probability, 0);
  const noWinProb = 1 - winProb;
  const noWinEVContrib = -ticketCost * noWinProb;

  const totalEV =
    tiers.reduce((s, t) => s + t.evContrib, 0) + noWinEVContrib;

  // Breakeven jackpot, computed from the same tier table:
  // totalEV = sum(prize_i * p_i) - ticketCost, so EV = 0 when
  // jackpot * p_jackpot = ticketCost - sum(non-jackpot prize_i * p_i)
  const nonJackpotPrizeEV = LOTTERY_TIERS.slice(1).reduce(
    (s, t) => s + t.prize * t.probability,
    0
  );
  const breakevenJackpot =
    (ticketCost - nonJackpotPrizeEV) / LOTTERY_TIERS[0].probability;

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-0.5">
            Lottery EV Breakdown
          </p>
          <p className="text-[12px] text-[#475569]">
            Powerball-style: $2 ticket · simplified prize tiers
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[#94a3b8] mb-0.5">Total EV per $2 ticket</p>
          <p className="text-[20px] font-black font-mono text-[#ef4444]">
            {totalEV.toFixed(4)}
          </p>
        </div>
      </div>

      {/* Formula reminder */}
      <div className="mb-4 p-2.5 rounded-xl bg-[#0a0e1a] border border-[#1e293b]">
        <p className="text-[12px] font-mono text-[#94a3b8] text-center">
          EV = Σ (prize − $2) × P(win tier) + (−$2) × P(no win)
        </p>
      </div>

      {/* Tier table — scrollable on small screens */}
      <div className="overflow-x-auto">
        <table className="w-full text-[12px] min-w-[520px]">
          <thead>
            <tr className="border-b border-[#1e293b]">
              <th className="text-left py-2 pr-3 text-[10px] font-semibold uppercase tracking-widest text-[#475569]">
                Prize Tier
              </th>
              <th className="text-right py-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-[#475569]">
                Prize
              </th>
              <th className="text-right py-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-[#475569]">
                Odds
              </th>
              <th className="text-right py-2 pl-3 text-[10px] font-semibold uppercase tracking-widest text-[#475569]">
                EV Contribution
              </th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((tier) => (
              <tr key={tier.label} className="border-b border-[#1e293b]/50 hover:bg-[#1e293b]/30 transition-colors">
                <td className="py-2 pr-3 text-white font-medium">{tier.label}</td>
                <td className="py-2 px-3 text-right font-mono text-[#3bb4a4]">
                  ${tier.prize >= 1_000_000
                    ? `${(tier.prize / 1_000_000).toFixed(0)}M`
                    : tier.prize.toLocaleString()}
                </td>
                <td className="py-2 px-3 text-right text-[#94a3b8] font-mono text-[11px]">
                  {tier.odds}
                </td>
                <td className="py-2 pl-3 text-right font-mono font-semibold text-[#ef4444]">
                  {tier.evContrib >= 0 ? "+" : ""}
                  {tier.evContrib.toFixed(6)}
                </td>
              </tr>
            ))}
            {/* No-win row */}
            <tr className="border-b border-[#1e293b]/50 hover:bg-[#1e293b]/30 transition-colors">
              <td className="py-2 pr-3 text-[#94a3b8]">No prize</td>
              <td className="py-2 px-3 text-right font-mono text-[#ef4444]">−$2</td>
              <td className="py-2 px-3 text-right text-[#94a3b8] font-mono text-[11px]">
                ~1 in 1.1
              </td>
              <td className="py-2 pl-3 text-right font-mono font-semibold text-[#ef4444]">
                {noWinEVContrib.toFixed(6)}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="py-3 pr-3 text-[13px] font-semibold text-white">
                Total Expected Value
              </td>
              <td className="py-3 pl-3 text-right text-[18px] font-black font-mono text-[#ef4444]">
                {totalEV >= 0 ? "+" : ""}
                {totalEV.toFixed(4)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Key insight */}
      <div className="mt-4 rounded-xl bg-[var(--color-warning)]/5 border border-[var(--color-warning)]/30 p-4">
        <p className="text-[12px] text-[var(--color-warning)] font-semibold mb-1">Key Insight</p>
        <p className="text-[12px] text-[#94a3b8] leading-relaxed">
          Every $2 lottery ticket has an expected return of approximately{" "}
          <strong className="text-[#ef4444]">{totalEV.toFixed(2)}</strong>. This means
          for every dollar spent on lottery tickets, you expect to lose about{" "}
          <strong className="text-[#ef4444]">
            {Math.abs(totalEV / ticketCost * 100).toFixed(0)}¢
          </strong>
          . The jackpot prize would need to exceed{" "}
          <strong className="text-white">~${(breakevenJackpot / 1_000_000).toFixed(0)}M</strong>{" "}
          (computed from this prize table) before the EV turns positive, and
          even then, taxes and lump-sum penalties reduce the real EV further.
        </p>
      </div>

      {/* EV bar visualization */}
      <div className="mt-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#475569] mb-2">
          EV contribution by tier (log scale)
        </p>
        <div className="space-y-1.5">
          {tiers.map((tier) => {
            // Log-scale mapping: smallest tier EV -> 2% width, largest -> 100% width.
            // (Dividing two logs of numbers < 1 previously pushed every bar past 100%.)
            const magnitudes = tiers
              .map((t) => Math.abs(t.evContrib))
              .filter((v) => v > 0);
            const maxMag = Math.max(...magnitudes);
            const minMag = Math.min(...magnitudes);
            const logSpan = Math.log10(maxMag) - Math.log10(minMag) || 1;
            const mag = Math.abs(tier.evContrib);
            const barWidth =
              mag > 0
                ? 2 + 98 * ((Math.log10(mag) - Math.log10(minMag)) / logSpan)
                : 0;

            return (
              <div key={tier.label} className="flex items-center gap-2">
                <span className="text-[10px] text-[#94a3b8] w-24 shrink-0 truncate">
                  {tier.label}
                </span>
                <div className="flex-1 h-3 rounded-full bg-[#1e293b] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#ef4444]/60"
                    style={{ width: `${Math.min(100, barWidth)}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-[#ef4444] w-20 text-right shrink-0">
                  {tier.evContrib.toFixed(5)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
