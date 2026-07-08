"use client";

import React, { useMemo } from "react";
import {
  JoinType,
  ALL_JOIN_TYPES,
  JOIN_META,
  CUSTOMERS,
  ORDERS,
  executeJoin,
} from "./types";

type Props = {
  pick: JoinType | null;
  onPick: (t: JoinType) => void;
  solved: boolean;
};

export default function JoinChallenge({ pick, onPick, solved }: Props) {
  // All feedback numbers are computed by actually running the joins.
  const stats = useMemo(() => {
    const leftRows = executeJoin(CUSTOMERS, ORDERS, "left");
    const innerRows = executeJoin(CUSTOMERS, ORDERS, "inner");
    const rightRows = executeJoin(CUSTOMERS, ORDERS, "right");
    const fullRows = executeJoin(CUSTOMERS, ORDERS, "full");
    const noOrderNames = leftRows
      .filter((r) => r.order === null)
      .map((r) => (r.customer ? r.customer.name : ""));
    const orphanOrders = fullRows.filter((r) => r.customer === null).length;
    return {
      leftCount: leftRows.length,
      innerCount: innerRows.length,
      rightCount: rightRows.length,
      fullCount: fullRows.length,
      noOrderNames,
      orphanOrders,
    };
  }, []);

  const names = stats.noOrderNames.join(" and ");

  const feedback: Record<JoinType, { correct: boolean; text: string }> = {
    left: {
      correct: true,
      text: `Correct. A LEFT JOIN from customers returns ${stats.leftCount} rows and keeps all ${CUSTOMERS.length} customers. Exactly ${stats.noOrderNames.length} rows come back with NULL in the order columns: ${names}. Filter WHERE order_id IS NULL and those are your customers with no orders.`,
    },
    inner: {
      correct: false,
      text: `Not this one. An INNER JOIN returns ${stats.innerCount} rows and every one of them has an order. ${names} never appear in the result, and they are exactly the customers you were asked to find.`,
    },
    right: {
      correct: false,
      text: `Not this one. A RIGHT JOIN keeps all ${ORDERS.length} orders (${stats.rightCount} result rows, including the orphan order 106), but a customer with no orders has nothing to match on the order side, so ${names} never appear.`,
    },
    full: {
      correct: false,
      text: `Close. A FULL OUTER JOIN returns ${stats.fullCount} rows and does contain the ${stats.noOrderNames.length} NULL-order rows you need, but it also drags in ${stats.orphanOrders} orphan order row with no customer. When the question is only about customers, LEFT JOIN from customers is the precise tool. Pick it to finish.`,
    },
  };

  return (
    <div>
      <div className="rounded-xl border border-[#1e293b] bg-[#162032] p-4 mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[var(--color-accent)] mb-2">
          The Question
        </p>
        <p className="text-[15px] font-semibold text-white">
          Which customers have no orders?
        </p>
        <p className="text-[11px] text-[#94a3b8] mt-1">
          You are joining customers to orders and will filter afterwards. Which join type
          guarantees the answer is even in the result?
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {ALL_JOIN_TYPES.map((t) => {
          const isPicked = pick === t;
          const isCorrectPick = isPicked && feedback[t].correct;
          return (
            <button
              key={t}
              aria-pressed={isPicked}
              onClick={() => onPick(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                isCorrectPick
                  ? "border-[var(--color-success)] text-[var(--color-success)]"
                  : isPicked
                    ? "border-[var(--color-warning)] text-[var(--color-warning)]"
                    : "border-[#1e293b] text-[#94a3b8] hover:text-white hover:border-[#334155]"
              }`}
            >
              {JOIN_META[t].sqlKeyword}
            </button>
          );
        })}
      </div>

      <div aria-live="polite">
        {pick !== null && (
          <div
            className={`rounded-xl border p-4 ${
              feedback[pick].correct
                ? "border-[var(--color-success)]/50"
                : "border-[var(--color-warning)]/50"
            }`}
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-wide mb-1.5"
              style={{
                color: feedback[pick].correct
                  ? "var(--color-success)"
                  : "var(--color-warning)",
              }}
            >
              {feedback[pick].correct ? "Solved" : "Try another join"}
            </p>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              {feedback[pick].text}
            </p>
          </div>
        )}
        {pick === null && !solved && (
          <p className="text-[11px] text-[#475569]">
            Pick a join type to get computed feedback from the actual join results.
          </p>
        )}
      </div>
    </div>
  );
}
