export type Scale = "nominal" | "ordinal" | "interval" | "ratio";
export type DataType =
  | "shirtSizes"
  | "customerId"
  | "temperature"
  | "weight"
  | "starRating"
  | "eyeColor"
  | "income"
  | "examScore"
  | "yearOfBirth";

export interface DataExample {
  id: DataType;
  label: string;
  description: string;
  icon: string;
  correctScale: Scale;
}

export interface ValidOperation {
  name: string;
  why: string;
  availableFor: Scale[];
}

export const DATA_EXAMPLES: DataExample[] = [
  { id: "shirtSizes",   label: "Shirt Sizes",       description: "S, M, L, XL",           icon: "👕", correctScale: "ordinal"  },
  { id: "customerId",   label: "Customer ID",        description: "1001, 1002, 1003",        icon: "🪪", correctScale: "nominal"  },
  { id: "temperature",  label: "Temperature (°C)",   description: "15, 20, 25 degrees",      icon: "🌡️", correctScale: "interval" },
  { id: "weight",       label: "Body Weight (kg)",   description: "60, 75, 90 kilograms",    icon: "⚖️", correctScale: "ratio"    },
  { id: "starRating",   label: "Star Rating",         description: "1★, 2★, 5★",             icon: "⭐", correctScale: "ordinal"  },
  { id: "eyeColor",     label: "Eye Color",           description: "Blue, Brown, Green",      icon: "👁️", correctScale: "nominal"  },
  { id: "income",       label: "Annual Income ($)",   description: "$30k, $50k, $80k",        icon: "💵", correctScale: "ratio"    },
  { id: "examScore",    label: "Exam Percentile",     description: "25th, 50th, 75th",        icon: "📊", correctScale: "ordinal"  },
  { id: "yearOfBirth",  label: "Year of Birth",       description: "1995, 2000, 2005",        icon: "📅", correctScale: "interval" },
];

export const SCALE_INFO: Record<Scale, { name: string; description: string; color: string }> = {
  nominal:  { name: "Nominal",  description: "Categories with no order (e.g., colors, gender, zip code)",         color: "#3b82f6" },
  ordinal:  { name: "Ordinal",  description: "Ordered categories (e.g., rankings, satisfaction levels)",          color: "#a855f7" },
  interval: { name: "Interval", description: "Numeric with no true zero (e.g., temperature, IQ score)",           color: "#f97316" },
  ratio:    { name: "Ratio",    description: "Numeric with true zero (e.g., weight, income, height)",             color: "#3bb4a4" },
};

export const VALID_OPERATIONS: ValidOperation[] = [
  {
    name: "Count / frequency",
    why: "You can always count how many items fall into each category.",
    availableFor: ["nominal", "ordinal", "interval", "ratio"],
  },
  {
    name: "Mode",
    why: "The most common value is always meaningful regardless of scale.",
    availableFor: ["nominal", "ordinal", "interval", "ratio"],
  },
  {
    name: "Rank / order",
    why: "Categories must have a defined order to be rankable.",
    availableFor: ["ordinal", "interval", "ratio"],
  },
  {
    name: "Median / percentiles",
    why: "Finding the middle requires ordered data.",
    availableFor: ["ordinal", "interval", "ratio"],
  },
  {
    name: "Mean",
    why: "Averaging requires equal-spaced intervals. You can't average 'Blue, Brown, Green' or 'Small, Medium, Large'.",
    availableFor: ["interval", "ratio"],
  },
  {
    name: "Standard deviation",
    why: "Measuring spread around the mean requires interval or ratio data.",
    availableFor: ["interval", "ratio"],
  },
  {
    name: "Ratios & proportions",
    why: "'Twice as heavy' requires a true zero. 0°C is not 'no temperature' — so 40°C is not twice as warm as 20°C.",
    availableFor: ["ratio"],
  },
  {
    name: "Geometric mean",
    why: "Geometric mean is meaningful only when ratios are interpretable (true zero).",
    availableFor: ["ratio"],
  },
];
