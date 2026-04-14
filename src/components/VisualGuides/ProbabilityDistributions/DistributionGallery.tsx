"use client";

import React from "react";
import { DistributionType, DIST_ORDER } from "./types";
import DistributionCard from "./DistributionCard";

interface Props {
  selectedType: DistributionType | null;
  params: Record<DistributionType, Record<string, number>>;
  openedTypes: Set<DistributionType>;
  onSelect: (type: DistributionType) => void;
}

export default function DistributionGallery({
  selectedType,
  params,
  openedTypes,
  onSelect,
}: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {DIST_ORDER.map(type => (
        <DistributionCard
          key={type}
          type={type}
          params={params[type]}
          isSelected={selectedType === type}
          isOpened={openedTypes.has(type)}
          onClick={() => onSelect(type)}
        />
      ))}
    </div>
  );
}
