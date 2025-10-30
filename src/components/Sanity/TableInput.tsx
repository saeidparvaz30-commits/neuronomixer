import React from "react";
import { set, unset } from "sanity";

export default function TableInput({ value = { rows: [] }, onChange }) {
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData("text");

    if (pasted.includes("\t")) {
      e.preventDefault();

      const rows = pasted
        .trim()
        .split("\n")
        .map((r) => ({
          _key: crypto.randomUUID(),
          _type: "tableRow", // ✅ ensure rows have a type if schema expects it
          cells: r.split("\t").map((c) => c.trim()),
        }));

      // ✅ Assign _type at top-level too
      onChange(
        set({
          _type: "table", // <-- this fixes “missing type name”
          rows,
        })
      );
    }
  };

  const handleClear = () => onChange(unset());

  return (
    <div className="flex flex-col gap-2">
      <textarea
        placeholder="Paste here from Excel or Google Sheets..."
        onPaste={handlePaste}
        rows={4}
        className="p-2 border border-gray-400 rounded-md w-full text-sm font-mono bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="button"
        onClick={handleClear}
        className="self-end px-3 py-1 text-xs rounded-md bg-red-100 hover:bg-red-200 text-red-700 transition"
      >
        Clear table
      </button>
    </div>
  );
}
