"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { DatasetType, ChartOptionId } from "./types";
import { DATASETS } from "./types";
import DatasetSelector from "./DatasetSelector";
import QuestionPrompt from "./QuestionPrompt";
import ChartOptionButtons from "./ChartOptionButtons";
import ChartRenderer from "./ChartRenderer";
import ChartEducationTooltip from "./ChartEducationTooltip";

interface Props {
  selectedDataset: DatasetType;
  selectedChartOption: ChartOptionId | null;
  datasetsCorrected: Set<DatasetType>;
  onDatasetChange: (id: DatasetType) => void;
  onChartSelect: (id: ChartOptionId) => void;
}

export default function ChartChooserSection({
  selectedDataset,
  selectedChartOption,
  datasetsCorrected,
  onDatasetChange,
  onChartSelect,
}: Props) {
  const dataset = DATASETS.find((d) => d.id === selectedDataset)!;
  const selectedOption = selectedChartOption
    ? dataset.options.find((o) => o.id === selectedChartOption) ?? null
    : null;
  const isBestSelected = selectedOption?.quality === "best";
  const datasetCorrected = datasetsCorrected.has(selectedDataset);

  return (
    <div className="space-y-6">
      <DatasetSelector selected={selectedDataset} onChange={onDatasetChange} />

      <AnimatePresence mode="wait">
        <motion.div
          key={selectedDataset}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="space-y-5"
        >
          <QuestionPrompt dataset={selectedDataset} />

          <ChartOptionButtons
            options={dataset.options}
            selected={selectedChartOption}
            onSelect={onChartSelect}
            datasetCorrected={datasetCorrected}
          />

          <AnimatePresence>
            {selectedChartOption && (
              <motion.div
                key={selectedChartOption}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
                aria-live="polite"
              >
                <ChartRenderer dataset={selectedDataset} chartId={selectedChartOption} />
                <ChartEducationTooltip
                  explanation={
                    isBestSelected
                      ? dataset.bestExplanation
                      : (selectedOption?.note ?? "")
                  }
                  whenToUse={dataset.whenToUse}
                  isBest={!!isBestSelected}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
