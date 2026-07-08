export const PROMPT_IDS = {
  GENERAL: "general",
  GUIDE_COMPLETION: "guide-completion",
  BLOG_SCROLL: "blog-scroll",
} as const;

export type PromptId = (typeof PROMPT_IDS)[keyof typeof PROMPT_IDS];

export const COOLDOWN_DAYS = 7;
export const GENERAL_PROMPT_DELAY_MS = 60_000;
export const BLOG_SCROLL_THRESHOLD = 0.66;
