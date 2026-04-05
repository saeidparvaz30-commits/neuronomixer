export type StageId = "raw-source" | "collection" | "cleaning" | "transformation" | "analysis-ready";
export type StageStatus = "locked" | "active" | "completed";

export type StageState = {
  id: StageId;
  status: StageStatus;
  challengePassed: boolean;
  isExpanded: boolean;
};

export const STAGE_CONFIGS = [
  { id: "raw-source"     as StageId, index: 0, color: "#ef4444", title: "Raw Source",     tagline: "Where data lives before anyone touches it"           },
  { id: "collection"     as StageId, index: 1, color: "#f59e0b", title: "Collection",     tagline: "Pulling data from multiple sources into one place"    },
  { id: "cleaning"       as StageId, index: 2, color: "#3bb4a4", title: "Cleaning",       tagline: "Fixing errors, filling gaps, removing noise"          },
  { id: "transformation" as StageId, index: 3, color: "#3b82f6", title: "Transformation", tagline: "Reshaping and enriching data for analysis"            },
  { id: "analysis-ready" as StageId, index: 4, color: "#d4af37", title: "Analysis-Ready", tagline: "Clean, structured, and ready for insights"           },
];

export const initialStages: StageState[] = [
  { id: "raw-source",     status: "active", challengePassed: false, isExpanded: true  },
  { id: "collection",     status: "locked", challengePassed: false, isExpanded: false },
  { id: "cleaning",       status: "locked", challengePassed: false, isExpanded: false },
  { id: "transformation", status: "locked", challengePassed: false, isExpanded: false },
  { id: "analysis-ready", status: "locked", challengePassed: false, isExpanded: false },
];
