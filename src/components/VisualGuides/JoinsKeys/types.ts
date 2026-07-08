export type JoinType = "inner" | "left" | "right" | "full";

export interface Customer {
  rowId: string;
  id: number;
  name: string;
  city: string;
}

export interface Order {
  rowId: string;
  orderId: number;
  customerId: number;
  item: string;
  amount: number;
}

export interface JoinedRow {
  id: string;
  customer: Customer | null;
  order: Order | null;
}

// Constant literal datasets: identical on server and client. No randomness anywhere.
export const CUSTOMERS: readonly Customer[] = [
  { rowId: "c1", id: 1, name: "Alice", city: "Oslo" },
  { rowId: "c2", id: 2, name: "Bruno", city: "Bergen" },
  { rowId: "c3", id: 3, name: "Chen", city: "Drammen" },
  { rowId: "c4", id: 4, name: "Dana", city: "Stavanger" },
  { rowId: "c5", id: 5, name: "Elin", city: "Trondheim" },
];

export const ORDERS: readonly Order[] = [
  { rowId: "o101", orderId: 101, customerId: 1, item: "Keyboard", amount: 120 },
  { rowId: "o102", orderId: 102, customerId: 1, item: "Monitor", amount: 310 },
  { rowId: "o103", orderId: 103, customerId: 2, item: "Desk mat", amount: 25 },
  { rowId: "o104", orderId: 104, customerId: 4, item: "Laptop stand", amount: 85 },
  { rowId: "o105", orderId: 105, customerId: 4, item: "USB hub", amount: 45 },
  { rowId: "o106", orderId: 106, customerId: 6, item: "Webcam", amount: 150 },
];

// Data-vis series colors for key values (literal hexes allowed for series colors).
const KEY_COLORS: Record<number, string> = {
  1: "#3bb4a4",
  2: "#a855f7",
  3: "#ec4899",
  4: "#93c5fd",
  5: "#ef4444",
  6: "#94a3b8",
};

export function keyColor(id: number): string {
  return KEY_COLORS[id] ?? "#94a3b8";
}

export interface JoinMeta {
  label: string;
  sqlKeyword: string;
  description: string;
}

export const JOIN_META: Record<JoinType, JoinMeta> = {
  inner: {
    label: "Inner",
    sqlKeyword: "INNER JOIN",
    description:
      "Keeps only the rows whose key matches on both sides. Unmatched rows from either table are dropped.",
  },
  left: {
    label: "Left",
    sqlKeyword: "LEFT JOIN",
    description:
      "Keeps every customer. Where a customer has no order, the order columns are filled with NULL.",
  },
  right: {
    label: "Right",
    sqlKeyword: "RIGHT JOIN",
    description:
      "Keeps every order. Where an order points at a customer that does not exist, the customer columns are filled with NULL.",
  },
  full: {
    label: "Full outer",
    sqlKeyword: "FULL OUTER JOIN",
    description:
      "Keeps everything from both sides. Any row without a partner gets NULL on the missing side.",
  },
};

export const ALL_JOIN_TYPES: readonly JoinType[] = ["inner", "left", "right", "full"];

/**
 * The join engine. Every result table and every row count in this guide comes
 * from running this function on the on-screen data.
 */
export function executeJoin(
  left: readonly Customer[],
  right: readonly Order[],
  type: JoinType
): JoinedRow[] {
  const rows: JoinedRow[] = [];

  for (const c of left) {
    const matches = right.filter((o) => o.customerId === c.id);
    if (matches.length > 0) {
      for (const o of matches) {
        rows.push({ id: `${c.rowId}|${o.rowId}`, customer: c, order: o });
      }
    } else if (type === "left" || type === "full") {
      rows.push({ id: `${c.rowId}|null`, customer: c, order: null });
    }
  }

  if (type === "right" || type === "full") {
    const leftKeys = new Set(left.map((c) => c.id));
    for (const o of right) {
      if (!leftKeys.has(o.customerId)) {
        rows.push({ id: `null|${o.rowId}`, customer: null, order: o });
      }
    }
  }

  return rows;
}

/**
 * Break the primary key: return the customers table with `copies` total copies
 * of Alice's row (customer id 1). copies = 1 is the intact table.
 */
export function buildFanCustomers(copies: number): Customer[] {
  const result: Customer[] = [];
  for (const c of CUSTOMERS) {
    result.push(c);
    if (c.id === 1) {
      for (let i = 2; i <= copies; i++) {
        result.push({ ...c, rowId: `c1-dup${i}` });
      }
    }
  }
  return result;
}
