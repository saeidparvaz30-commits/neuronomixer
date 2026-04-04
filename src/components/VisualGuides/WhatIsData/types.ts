export type BucketId = "structured" | "semi" | "unstructured";

export type DataItemDef = {
  id: string;
  label: string;
  bucket: BucketId; // the correct bucket
  tooltip: {
    type: string;
    examples: string[];
    keyTrait: string;
  };
  wrongHints: Partial<Record<BucketId, string>>;
};

export type ItemState = {
  bucket: BucketId | "source";
  isCorrect: boolean | null;
};
