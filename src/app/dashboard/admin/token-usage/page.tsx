import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const MODEL_COST: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5-20251001": { input: 1.0, output: 5.0 },
};

function calcCost(model: string, inputTokens: number, outputTokens: number) {
  const rates = MODEL_COST[model] ?? { input: 3.0, output: 15.0 };
  return (inputTokens / 1_000_000) * rates.input + (outputTokens / 1_000_000) * rates.output;
}

function fmt(n: number) {
  return n.toLocaleString();
}

function fmtCost(usd: number) {
  return usd < 0.001 ? "<$0.001" : `$${usd.toFixed(4)}`;
}

export default async function TokenUsagePage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN") redirect("/dashboard");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [allTime, thisMonth, today, byActivity, byUser, recent] = await Promise.all([
    prisma.tokenUsage.aggregate({ _sum: { totalTokens: true, inputTokens: true, outputTokens: true } }),
    prisma.tokenUsage.aggregate({
      where: { createdAt: { gte: startOfMonth } },
      _sum: { totalTokens: true },
    }),
    prisma.tokenUsage.aggregate({
      where: { createdAt: { gte: startOfDay } },
      _sum: { totalTokens: true },
    }),
    prisma.tokenUsage.groupBy({
      by: ["activity", "model"],
      _sum: { inputTokens: true, outputTokens: true, totalTokens: true },
      _count: { id: true },
      orderBy: { _sum: { totalTokens: "desc" } },
    }),
    prisma.tokenUsage.groupBy({
      by: ["userId"],
      _sum: { totalTokens: true, inputTokens: true, outputTokens: true },
      _count: { id: true },
      orderBy: { _sum: { totalTokens: "desc" } },
      take: 20,
    }),
    prisma.tokenUsage.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  // Fetch user names for per-user table
  const userIds = byUser.map((r) => r.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const totalCost = allTime._sum.inputTokens && allTime._sum.outputTokens
    ? recent.reduce((acc, r) => acc + calcCost(r.model, r.inputTokens, r.outputTokens), 0)
    : 0;

  const allTimeCost = byActivity.reduce(
    (acc, r) => acc + calcCost(r.model, r._sum.inputTokens ?? 0, r._sum.outputTokens ?? 0),
    0
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-white">AI Token Usage</h1>
        <p className="text-sm text-gray-400 mt-1">Consumption across CV Builder and CV Designer</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "All-time tokens", value: fmt(allTime._sum.totalTokens ?? 0) },
          { label: "This month", value: fmt(thisMonth._sum.totalTokens ?? 0) },
          { label: "Today", value: fmt(today._sum.totalTokens ?? 0) },
          { label: "Est. all-time cost", value: fmtCost(allTimeCost) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[var(--color-surface)] rounded-xl p-4 border border-white/10">
            <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* By activity */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">By Activity</h2>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Activity</th>
                <th className="px-4 py-3 text-left">Model</th>
                <th className="px-4 py-3 text-right">Calls</th>
                <th className="px-4 py-3 text-right">Input tokens</th>
                <th className="px-4 py-3 text-right">Output tokens</th>
                <th className="px-4 py-3 text-right">Total tokens</th>
                <th className="px-4 py-3 text-right">Est. cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {byActivity.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-500">No data yet</td>
                </tr>
              ) : byActivity.map((r, i) => {
                const cost = calcCost(r.model, r._sum.inputTokens ?? 0, r._sum.outputTokens ?? 0);
                return (
                  <tr key={i} className="hover:bg-white/5 text-gray-300">
                    <td className="px-4 py-3 font-medium text-white">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                        r.activity === "cv-design"
                          ? "bg-[var(--color-primary)]/20 text-[var(--color-secondary)]"
                          : "bg-purple-900/30 text-purple-400"
                      }`}>
                        {r.activity}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.model}</td>
                    <td className="px-4 py-3 text-right">{fmt(r._count.id)}</td>
                    <td className="px-4 py-3 text-right">{fmt(r._sum.inputTokens ?? 0)}</td>
                    <td className="px-4 py-3 text-right">{fmt(r._sum.outputTokens ?? 0)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{fmt(r._sum.totalTokens ?? 0)}</td>
                    <td className="px-4 py-3 text-right text-[var(--color-accent)]">{fmtCost(cost)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Per-user breakdown */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Top Users by Consumption</h2>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-right">Calls</th>
                <th className="px-4 py-3 text-right">Input tokens</th>
                <th className="px-4 py-3 text-right">Output tokens</th>
                <th className="px-4 py-3 text-right">Total tokens</th>
                <th className="px-4 py-3 text-right">Est. cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {byUser.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">No data yet</td>
                </tr>
              ) : byUser.map((r) => {
                const u = userMap[r.userId];
                const cost = calcCost("claude-sonnet-4-6", r._sum.inputTokens ?? 0, r._sum.outputTokens ?? 0);
                return (
                  <tr key={r.userId} className="hover:bg-white/5 text-gray-300">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{u?.name ?? "Unknown"}</p>
                      <p className="text-xs text-gray-500">{u?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-right">{fmt(r._count.id)}</td>
                    <td className="px-4 py-3 text-right">{fmt(r._sum.inputTokens ?? 0)}</td>
                    <td className="px-4 py-3 text-right">{fmt(r._sum.outputTokens ?? 0)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{fmt(r._sum.totalTokens ?? 0)}</td>
                    <td className="px-4 py-3 text-right text-[var(--color-accent)]">{fmtCost(cost)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent log */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Recent Calls (last 50)</h2>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Time</th>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Activity</th>
                <th className="px-4 py-3 text-left">Model</th>
                <th className="px-4 py-3 text-right">In</th>
                <th className="px-4 py-3 text-right">Out</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-gray-500">No calls logged yet</td>
                </tr>
              ) : recent.map((r) => {
                const cost = calcCost(r.model, r.inputTokens, r.outputTokens);
                return (
                  <tr key={r.id} className="hover:bg-white/5 text-gray-300">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white text-xs">{r.user.name ?? "—"}</p>
                      <p className="text-xs text-gray-500">{r.user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                        r.activity === "cv-design"
                          ? "bg-[var(--color-primary)]/20 text-[var(--color-secondary)]"
                          : "bg-purple-900/30 text-purple-400"
                      }`}>
                        {r.activity}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.model.split("-").slice(0, 2).join("-")}</td>
                    <td className="px-4 py-3 text-right text-xs">{fmt(r.inputTokens)}</td>
                    <td className="px-4 py-3 text-right text-xs">{fmt(r.outputTokens)}</td>
                    <td className="px-4 py-3 text-right text-xs font-semibold">{fmt(r.totalTokens)}</td>
                    <td className="px-4 py-3 text-right text-xs text-[var(--color-accent)]">{fmtCost(cost)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
