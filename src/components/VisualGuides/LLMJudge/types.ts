// Types and the fixed grading corpus for the LLM-as-Judge guide.
// All data is constant and authored: identical on server and client, no randomness.

export type Choice = "first" | "second";

export interface RubricFeatures {
  /** 0-4: factual correctness of the claims the answer makes */
  accuracy: number;
  /** 0-3: how completely it answers what was actually asked */
  coverage: number;
  /** 0-3: structure and readability */
  clarity: number;
}

export interface Answer {
  text: string;
  /** Fictional model that produced the answer */
  author: string;
  /** The rubric's reading of this answer. Part of the dataset, shown in the UI. */
  features: RubricFeatures;
}

export interface CorpusItem {
  id: number;
  topic: string;
  question: string;
  /** Answer shown in position 1 */
  first: Answer;
  /** Answer shown in position 2 */
  second: Answer;
  /** Expert panel gold label: which answer the humans judged better */
  human: Choice;
  /** Why the panel chose what it chose */
  note: string;
}

/** The judge is itself a model; some corpus answers were written by the same model. */
export const JUDGE_MODEL = "Nomix-1";
export const OTHER_MODEL = "Quorra-7B";

/** Items the reader grades by hand before meeting the automated judge. */
export const BASELINE_IDS: readonly number[] = [1, 4, 10];

/**
 * The panel's gold labels are deliberately imbalanced: 8 of 12 point to the
 * answer in position 1. A balanced 6/6 panel would freeze Cohen's pe at 0.5
 * and make kappa a fixed rescale of raw agreement; the imbalance lets pe move
 * with the judge's own pick rate, so kappa and agreement can visibly diverge.
 */
export const CORPUS: readonly CorpusItem[] = [
  {
    id: 1,
    topic: "HTTP 404",
    question: "What does HTTP status code 404 mean?",
    first: {
      text: "404 Not Found means the server could not find the requested resource. Either the URL is wrong or the page was removed.",
      author: OTHER_MODEL,
      features: { accuracy: 4, coverage: 3, clarity: 2 },
    },
    second: {
      text: "HTTP status codes are how servers communicate outcomes back to browsers. They come in five families, from 1xx through 5xx, and the 4xx family covers client-side errors, meaning the request itself had a problem. Codes in this family are among the most common you will encounter while browsing the web.",
      author: JUDGE_MODEL,
      features: { accuracy: 1, coverage: 1, clarity: 3 },
    },
    human: "first",
    note: "The second answer is fluent trivia about status codes in general. It never says what 404 means, so the panel picked the short direct answer.",
  },
  {
    id: 2,
    topic: "km to miles",
    question: "Convert 5 kilometers to miles.",
    first: {
      text: "5 kilometers is about 3.11 miles. One kilometer equals roughly 0.6214 miles.",
      author: OTHER_MODEL,
      features: { accuracy: 4, coverage: 3, clarity: 3 },
    },
    second: {
      text: "Kilometers and miles are both units of distance, and converting between them is a common everyday task. As a rule of thumb you can multiply by roughly 0.6, so 5 kilometers works out to somewhere around 3 miles, which is close enough for most practical purposes.",
      author: JUDGE_MODEL,
      features: { accuracy: 2, coverage: 2, clarity: 2 },
    },
    human: "first",
    note: "3.11 miles is the number the question asked for. The long answer buries a rougher estimate in three sentences of filler.",
  },
  {
    id: 3,
    topic: "Moon phases",
    question: "Why does the moon have phases?",
    first: {
      text: "Half of the moon is always lit by the sun. As the moon orbits Earth, we see different fractions of that lit half, which produces the phases.",
      author: OTHER_MODEL,
      features: { accuracy: 4, coverage: 3, clarity: 3 },
    },
    second: {
      text: "The moon has phases because Earth's shadow falls across it from different angles as the month goes on.",
      author: JUDGE_MODEL,
      features: { accuracy: 0, coverage: 2, clarity: 3 },
    },
    human: "first",
    note: "The second answer states a common misconception with total confidence. Earth's shadow causes eclipses, not phases.",
  },
  {
    id: 4,
    topic: "MD5 passwords",
    question: "Is it safe to store passwords with MD5?",
    first: {
      text: "MD5 is a fast, widely supported hashing algorithm that has been trusted for decades across the industry, so it remains a dependable and convenient choice for storing user passwords in production systems.",
      author: JUDGE_MODEL,
      features: { accuracy: 1, coverage: 3, clarity: 3 },
    },
    second: {
      text: "No. MD5 is fast and broken. Use a slow, salted algorithm like bcrypt, scrypt, or Argon2.",
      author: OTHER_MODEL,
      features: { accuracy: 4, coverage: 3, clarity: 2 },
    },
    human: "second",
    note: "The first answer reads smoothly and is dangerously wrong. The blunt answer gives the correct advice and names real alternatives.",
  },
  {
    id: 5,
    topic: "Capital of Australia",
    question: "What is the capital of Australia?",
    first: {
      text: "Canberra.",
      author: OTHER_MODEL,
      features: { accuracy: 4, coverage: 2, clarity: 3 },
    },
    second: {
      text: "Canberra. Many people guess Sydney because it is the largest city, but Canberra was purpose-built as the capital as a compromise between Sydney and Melbourne.",
      author: JUDGE_MODEL,
      features: { accuracy: 4, coverage: 3, clarity: 3 },
    },
    human: "second",
    note: "Both are correct, but the second anticipates the common Sydney mistake and explains it. A rare case where the longer answer earns its length.",
  },
  {
    id: 6,
    topic: "Undo git commit",
    question: "How do I undo my last git commit but keep the changes?",
    first: {
      text: "Run git reset --soft HEAD~1. The commit disappears and your changes stay staged, ready to edit or recommit.",
      author: JUDGE_MODEL,
      features: { accuracy: 4, coverage: 3, clarity: 3 },
    },
    second: {
      text: "Use git revert HEAD. It is the safest way to undo the last commit in any situation.",
      author: OTHER_MODEL,
      features: { accuracy: 1, coverage: 2, clarity: 3 },
    },
    human: "first",
    note: "git revert creates a new commit and does not leave the changes uncommitted, so it fails the actual requirement. reset --soft does exactly what was asked.",
  },
  {
    id: 7,
    topic: "Seasons",
    question: "What causes seasons on Earth?",
    first: {
      text: "Earth's axis is tilted about 23.4 degrees. Each hemisphere leans toward the sun for part of the year and receives more direct light. The tilt, not distance, drives the seasons.",
      author: OTHER_MODEL,
      features: { accuracy: 4, coverage: 3, clarity: 3 },
    },
    second: {
      text: "Seasons happen because Earth's orbit is an ellipse, so we are closer to the sun in summer and farther away in winter, which changes how much heat reaches us over the year and explains why the two halves of the year feel so different.",
      author: JUDGE_MODEL,
      features: { accuracy: 1, coverage: 2, clarity: 3 },
    },
    human: "first",
    note: "The distance story is a famous misconception: the hemispheres have opposite seasons at the same distance. The tilt answer is the correct one.",
  },
  {
    id: 8,
    topic: "List vs tuple",
    question: "What is the difference between a list and a tuple in Python?",
    first: {
      text: "Lists are mutable and tuples are immutable. That is why a tuple can be a dictionary key while a list cannot.",
      author: OTHER_MODEL,
      features: { accuracy: 4, coverage: 3, clarity: 3 },
    },
    second: {
      text: "A list uses square brackets while a tuple uses parentheses. Beyond the syntax they are mostly interchangeable containers for storing several items together.",
      author: JUDGE_MODEL,
      features: { accuracy: 2, coverage: 1, clarity: 2 },
    },
    human: "first",
    note: "Bracket shape is surface trivia. Mutability is the actual difference, and the first answer shows a consequence of it.",
  },
  {
    id: 9,
    topic: "Correlation",
    question: "Does correlation imply causation?",
    first: {
      text: "No. Two variables can move together because of chance, a shared confounder, or reversed direction. Establishing causation needs experiments or careful causal inference.",
      author: OTHER_MODEL,
      features: { accuracy: 4, coverage: 3, clarity: 2 },
    },
    second: {
      text: "Not on its own, but a strong and stable correlation is usually solid evidence of causation, especially when the relationship holds across several datasets and the correlation coefficient is very high.",
      author: JUDGE_MODEL,
      features: { accuracy: 1, coverage: 2, clarity: 2 },
    },
    human: "first",
    note: "A high coefficient is not evidence of causation, no matter how stable. The hedged second answer smuggles the error back in.",
  },
  {
    id: 10,
    topic: "Overfitting",
    question: "What is overfitting in machine learning?",
    first: {
      text: "Overfitting is when a model fits its training data.",
      author: OTHER_MODEL,
      features: { accuracy: 1, coverage: 1, clarity: 1 },
    },
    second: {
      text: "Overfitting is when a model memorizes noise in its training data instead of the underlying pattern, so training accuracy looks great while performance on new data falls apart.",
      author: JUDGE_MODEL,
      features: { accuracy: 4, coverage: 3, clarity: 3 },
    },
    human: "second",
    note: "Fitting training data is what every model does. The second answer captures the failure: memorizing noise and losing generalization.",
  },
  {
    id: 11,
    topic: "Boiling an egg",
    question: "How long should I boil an egg for a firm yolk?",
    first: {
      text: "Nine to eleven minutes in boiling water gives a fully firm yolk. Cool the egg in cold water afterward to stop the cooking.",
      author: JUDGE_MODEL,
      features: { accuracy: 4, coverage: 3, clarity: 3 },
    },
    second: {
      text: "Egg timing is surprisingly sensitive. Soft, medium, and hard yolks all need different times, and egg size, starting temperature, and even altitude change the result, so no single number works perfectly for every kitchen and every preference.",
      author: OTHER_MODEL,
      features: { accuracy: 2, coverage: 1, clarity: 3 },
    },
    human: "first",
    note: "The second answer lists caveats and never gives a time. The question asked for a number and the first answer delivers one plus a useful tip.",
  },
  {
    id: 12,
    topic: "Slow Python",
    question: "My Python script is slow. What should I do first?",
    first: {
      text: "Rewrite the hot loops in C or Rust, since compiled code is orders of magnitude faster than interpreted Python.",
      author: JUDGE_MODEL,
      features: { accuracy: 4, coverage: 2, clarity: 3 },
    },
    second: {
      text: "Profile it first, for example with cProfile, so you know where the time actually goes. Most scripts have one or two hotspots, and optimizing anything else is wasted effort.",
      author: OTHER_MODEL,
      features: { accuracy: 3, coverage: 3, clarity: 3 },
    },
    human: "second",
    note: "The panel valued measure-before-optimize, which the question's word 'first' is really asking about. The rubric reads the rewrite advice as accurate and clear, so the judge disagrees here at most settings. Even an unbiased judge has a ceiling.",
  },
];
