/* TypeRace — pure typing-test logic. No DOM, no timers, no storage access:
   every function here is a plain function of its arguments, so it can be
   unit-tested in Node. The DOM layer (main.js) owns the clock, the input
   events and localStorage; this module owns the maths and the state machine.

   WPM definition (shown honestly on the page): a "word" is 5 characters, so
   WPM = (correct characters / 5) / minutes elapsed. Raw WPM counts every
   character typed, correct or not. Accuracy = correct / typed. */

export const MODE_SECONDS = { 15: 15, 30: 30, 60: 60, 120: 120 };
export const MODES = [15, 30, 60, 120];
export const CATEGORIES = ["quotes", "code", "pangrams"];
export const CATEGORY_LABELS = { quotes: "Quotes", code: "Code", pangrams: "Pangrams & fun" };
export const BESTS_KEY = "typerace:bests:v1";

/** Create a fresh test state for `text` in a timed mode (seconds). */
export function createTest(text, modeSeconds) {
  if (typeof text !== "string" || text.length === 0) {
    throw new Error("createTest: text must be a non-empty string");
  }
  if (!Object.prototype.hasOwnProperty.call(MODE_SECONDS, modeSeconds)) {
    throw new Error(`createTest: unknown mode ${modeSeconds}`);
  }
  return {
    text,
    modeSeconds,
    chars: [...text].map((ch) => ({ ch, status: "pending" })),
    index: 0, // next character position to type
    extra: 0, // characters typed past the end of the text
    correct: 0,
    incorrect: 0,
    started: false,
    finished: false,
    // per-second snapshots of correct chars, for the consistency score.
    samples: [],
  };
}

/** Is `key` a single printable character we should feed to the test? */
export function isPrintableKey(key) {
  return typeof key === "string" && key.length === 1;
}

/**
 * Feed one typed character into the state. Returns the state (mutated in
 * place, like a small state machine — main.js holds the single instance).
 * - before the end: the char is marked correct / incorrect, index advances.
 * - past the end: counted as an extra character (an error, not a crash).
 * - after finish: ignored.
 */
export function typeChar(state, key) {
  if (state.finished || !isPrintableKey(key)) return state;
  state.started = true;
  if (state.index < state.chars.length) {
    const slot = state.chars[state.index];
    if (key === slot.ch) {
      slot.status = "correct";
      state.correct += 1;
    } else {
      slot.status = "incorrect";
      state.incorrect += 1;
    }
    state.index += 1;
  } else {
    state.extra += 1;
    state.incorrect += 1;
  }
  return state;
}

/**
 * Undo the last typed character. Extra characters are removed first, then
 * the last typed slot goes back to "pending". No-op at the start.
 */
export function backspace(state) {
  if (state.finished) return state;
  if (state.extra > 0) {
    state.extra -= 1;
    state.incorrect -= 1;
    return state;
  }
  if (state.index === 0) return state;
  state.index -= 1;
  const slot = state.chars[state.index];
  if (slot.status === "correct") state.correct -= 1;
  else if (slot.status === "incorrect") state.incorrect -= 1;
  slot.status = "pending";
  return state;
}

/** Total characters typed so far (correct + incorrect + extra). */
export function typedCount(state) {
  return state.correct + state.incorrect;
}

/** Fraction of the text typed, 0..1. */
export function progress(state) {
  return state.chars.length === 0 ? 0 : state.index / state.chars.length;
}

/** Record a per-second snapshot (called by main.js on each timer tick). */
export function sample(state) {
  state.samples.push(state.correct);
  return state;
}

/**
 * Live / final stats for a test after `elapsedMs` milliseconds.
 * - wpm: correct chars only, the honest number.
 * - rawWpm: every typed char, correct or not.
 * - accuracy: correct / typed, 0 when nothing typed yet.
 * - consistency: 100 minus the coefficient of variation of per-second WPM,
 *   clamped 0..100; 100 when fewer than two samples exist.
 * All numbers are rounded to integers except accuracy/consistency (1 dp).
 */
export function computeStats(state, elapsedMs) {
  const minutes = Math.max(elapsedMs, 0) / 60000;
  const typed = typedCount(state);
  const wpm = minutes > 0 ? Math.round(state.correct / 5 / minutes) : 0;
  const rawWpm = minutes > 0 ? Math.round(typed / 5 / minutes) : 0;
  const accuracy = typed > 0 ? Math.round((state.correct / typed) * 1000) / 10 : 0;

  let consistency = 100;
  if (state.samples.length >= 2) {
    // Per-second WPM deltas (each sample is one second apart).
    const perSecond = state.samples.map((v, i) => (i === 0 ? v : v - state.samples[i - 1]));
    const mean = perSecond.reduce((a, b) => a + b, 0) / perSecond.length;
    if (mean > 0) {
      const variance = perSecond.reduce((a, b) => a + (b - mean) ** 2, 0) / perSecond.length;
      const cv = Math.sqrt(variance) / mean;
      consistency = Math.max(0, Math.min(100, Math.round((1 - cv) * 1000) / 10));
    }
  }

  return {
    wpm,
    rawWpm,
    accuracy,
    consistency,
    errors: state.incorrect,
    correctChars: state.correct,
    incorrectChars: state.incorrect - state.extra,
    extraChars: state.extra,
    typedChars: typed,
    totalChars: state.chars.length,
    progress: Math.round(progress(state) * 1000) / 10,
    elapsedMs: Math.max(elapsedMs, 0),
  };
}

/** Has the test run out of time, or has every character been typed? */
export function isComplete(state, elapsedMs) {
  return state.finished || elapsedMs >= state.modeSeconds * 1000 || state.index >= state.chars.length;
}

/** Mark the state finished (idempotent). */
export function finishTest(state) {
  state.finished = true;
  return state;
}

/* --- Personal bests (plain JSON; main.js owns the localStorage calls) --- */

/** Parse a stored bests blob; garbage in, empty object out. */
export function parseBests(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function bestKey(modeSeconds, category) {
  return `${modeSeconds}:${category}`;
}

/** The stored best for a mode + category, or null. */
export function getBest(bests, modeSeconds, category) {
  const entry = bests[bestKey(modeSeconds, category)];
  return entry && typeof entry.wpm === "number" ? entry : null;
}

/**
 * Compare a finished run against the stored best. A run beats the best on
 * WPM alone (accuracy is shown alongside, not a tiebreaker — a faster run
 * with a typo still counts, and the card says so).
 * Returns { isBest, best } where best is the record to store.
 */
export function compareBest(bests, modeSeconds, category, stats) {
  const previous = getBest(bests, modeSeconds, category);
  const candidate = {
    wpm: stats.wpm,
    accuracy: stats.accuracy,
    rawWpm: stats.rawWpm,
    errors: stats.errors,
    date: new Date().toISOString().slice(0, 10),
  };
  if (!previous || stats.wpm > previous.wpm) {
    return { isBest: true, best: candidate };
  }
  return { isBest: false, best: previous };
}

/** Return a new bests object with one entry replaced. */
export function withBest(bests, modeSeconds, category, best) {
  return { ...bests, [bestKey(modeSeconds, category)]: best };
}

/** Pick a random entry from a bank, avoiding `excludeId` when possible. */
export function pickText(bank, excludeId = null) {
  if (!Array.isArray(bank) || bank.length === 0) {
    throw new Error("pickText: bank must be a non-empty array");
  }
  const pool = bank.length > 1 && excludeId != null ? bank.filter((t) => t.id !== excludeId) : bank;
  const entry = pool[Math.floor(Math.random() * pool.length)];
  return entry;
}

/** Word count of a text (words = whitespace-separated tokens). */
export function wordCount(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}
