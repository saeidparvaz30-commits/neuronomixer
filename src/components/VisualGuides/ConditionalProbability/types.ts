// ── Scenario types ────────────────────────────────────────────────────────────

export type ScenarioType = "medical_testing" | "marbles" | "manufacturing";

// ── Tree data structures ──────────────────────────────────────────────────────

export interface TreeNodeData {
  id: string;
  label: string;
  /** Sub-label shown below the main label (e.g. probability) */
  sublabel?: string;
  level: number;
  /** 0-based horizontal index among siblings at this level */
  siblingIndex: number;
  /** Total siblings at this level */
  siblingCount: number;
  /** Colour of the node circle */
  color: string;
  /** Joint probability displayed only on leaf nodes */
  jointProbability?: string;
  /** Whether this is a leaf node */
  isLeaf?: boolean;
}

export interface TreeBranchData {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  /** Probability label shown on the branch midpoint */
  probability: string;
  /** Fraction string for display, e.g. "4/7" */
  fractionLabel?: string;
}

export interface TreeData {
  nodes: TreeNodeData[];
  branches: TreeBranchData[];
}

// ── Scenario data ─────────────────────────────────────────────────────────────

export interface ScenarioConfig {
  id: ScenarioType;
  label: string;
  description: string;
  tree: TreeData;
  /** Key facts about the conditional probability for this scenario */
  keyResult: {
    formula: string;
    numerator: string;
    denominator: string;
    result: string;
    interpretation: string;
  };
  /** Prefill values for the independence checker */
  independencePrefill: {
    pA: number;
    pB: number;
    pAGivenB: number;
    pALabel: string;
    pBLabel: string;
    pAGivenBLabel: string;
  };
  /** Grid side length — total squares = side * side */
  gridSide: number;
  /** Build the grid squares for this scenario */
  buildGrid: () => GridSquare[];
}

// ── Sample space grid ─────────────────────────────────────────────────────────

export type GridSquareCategory =
  | "disease_positive"    // medical: has disease & tests positive
  | "disease_negative"    // medical: has disease & tests negative
  | "healthy_positive"    // medical: healthy & tests positive
  | "healthy_negative"    // medical: healthy & tests negative
  | "red"                 // marbles: red marble
  | "blue"                // marbles: blue marble
  | "factory_a_defect"    // manufacturing: factory A, defective
  | "factory_a_ok"        // manufacturing: factory A, ok
  | "factory_b_defect"    // manufacturing: factory B, defective
  | "factory_b_ok";       // manufacturing: factory B, ok

export interface GridSquare {
  id: number;
  category: GridSquareCategory;
  /** Display colour */
  color: string;
  /** Short text label shown inside the square (optional) */
  innerLabel?: string;
}

// ── Filter states ─────────────────────────────────────────────────────────────

/** Which subset of squares to keep visible after a tree-node click */
export type GridFilter =
  | "all"
  // medical
  | "disease_people"          // disease group (both test outcomes)
  | "healthy_people"          // healthy group (both test outcomes)
  | "test_positive"           // everyone who tests positive (disease + healthy)
  | "disease_and_positive"    // disease AND test+
  | "disease_and_negative"    // disease AND test-
  | "healthy_and_positive"    // healthy AND test+ (false positives)
  | "healthy_and_negative"    // healthy AND test- (true negatives)
  // marbles (handled by MarbleBagView — filters unused)
  | "red_first"
  | "blue_first"
  // manufacturing
  | "factory_a_items"         // all factory A items (defect + ok)
  | "factory_b_items"         // all factory B items (defect + ok)
  | "defective"               // all defective items
  | "factory_a_defective"     // factory A defective only
  | "factory_a_ok_items"      // factory A ok only
  | "factory_b_defective"     // factory B defective only
  | "factory_b_ok_items";     // factory B ok only

// ── Node path highlight ───────────────────────────────────────────────────────

export interface HighlightedPath {
  nodeIds: string[];
  branchIds: string[];
  /** Human-readable calculation string */
  calculation: string;
}

// ── Component state ───────────────────────────────────────────────────────────

export interface State {
  scenario: ScenarioType;
  selectedNodeId: string | null;
  gridFilter: GridFilter;
  filterApplied: boolean;
  independenceInputs: {
    pA: number | null;
    pB: number | null;
    pAGivenB: number | null;
  };
  scenariosViewed: Set<ScenarioType>;
  sampleSpaceFiltered: number;
  pathsClicked: number;
  independenceChecked: boolean;
}
