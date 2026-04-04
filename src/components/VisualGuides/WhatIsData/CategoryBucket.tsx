"use client";

import React from "react";
import { motion } from "framer-motion";
import { BucketId, DataItemDef, ItemState } from "./types";

type CategoryBucketProps = {
  id: BucketId;
  label: string;
  subtitle: string;
  color: string;
  icon: React.ReactNode;
  sortedItems: DataItemDef[];
  isOver: boolean;
  isError: boolean;
  isKeyTarget: boolean;
  onKeyDrop: (bucketId: BucketId) => void;
  bucketRef: React.RefObject<HTMLDivElement | null>;
};

function CategoryBucketInner({
  id,
  label,
  subtitle,
  color,
  icon,
  sortedItems,
  isOver,
  isError,
  isKeyTarget,
  onKeyDrop,
  bucketRef,
}: CategoryBucketProps) {
  const total = 3;
  const count = sortedItems.length;

  return (
    <motion.div
      ref={bucketRef}
      animate={
        isError
          ? { x: [0, -10, 10, -6, 6, 0], borderColor: "#ef444488" }
          : { x: 0 }
      }
      transition={{ duration: 0.4 }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onKeyDrop(id);
        }
      }}
      tabIndex={isKeyTarget ? 0 : -1}
      role="region"
      aria-label={`${label} bucket — ${count} of ${total} sorted`}
      className={`
        flex flex-col rounded-2xl border-2 border-dashed transition-all duration-200 min-h-[180px] p-4
        ${isKeyTarget ? "ring-2 ring-[var(--color-accent)]" : ""}
      `}
      style={{
        borderColor: isOver
          ? color
          : isError
          ? "#ef4444"
          : color + "4d", // 30% opacity
        background: isOver
          ? color + "1a" // 10% opacity
          : color + "0d", // 5% opacity
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: color + "22", color }}
          >
            {icon}
          </div>
          <div>
            <div className="text-[13px] font-bold text-white">{label}</div>
            <div className="text-[10px] text-[#94a3b8]">{subtitle}</div>
          </div>
        </div>
        <span className="text-[11px] text-[#94a3b8] whitespace-nowrap mt-1">
          {count}/{total} sorted
        </span>
      </div>

      {/* Drop zone hint */}
      {count === 0 && !isOver && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[11px] text-white/20 text-center select-none">
            Drop items here
          </p>
        </div>
      )}

      {/* Over hint */}
      {isOver && count < total && (
        <div className="flex-1 flex items-center justify-center">
          <motion.p
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-[11px] font-semibold text-center"
            style={{ color }}
          >
            Release to drop
          </motion.p>
        </div>
      )}

      {/* Sorted item pills */}
      {count > 0 && (
        <div className="flex flex-col gap-1.5 mt-auto">
          {sortedItems.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", bounce: 0.3 }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
              style={{ background: color + "22" }}
            >
              <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-[11px] font-medium text-white truncate">{item.label}</span>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

const CategoryBucket = React.memo(CategoryBucketInner);
export default CategoryBucket;
