/* TypeRace — UI wiring. Imports the pure engine, text banks and card drawer,
   and binds them to the DOM. Runs init() on import (this script loads at the
   end of <body>). Exported functions exist so the jsdom harness can drive the
   real module graph: loadTest, restartTest, handleKey, finishNow, setMode,
   setCategory, getState, getLastStats, getBests. */
import {
  MODE_SECONDS,
  MODES,
  CATEGORIES,
  CATEGORY_LABELS,
  BESTS_KEY,
  createTest,
  typeChar,
  backspace,
  isPrintableKey,
  computeStats,
  isComplete,
  finishTest,
  sample,
  parseBests,
  getBest,
  compareBest,
  withBest,
  pickText,
  wordCount,
} from "./engine.js";
import { bankFor } from "./texts.js";
import { drawResultCard } from "./sharecard.js";

function $(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`TypeRace: missing element #${id}`);
  return el;
}

const els = {
  modeRow: $("mode-row"),
  categoryRow: $("category-row"),
  newTextBtn: $("new-text-btn"),
  restartBtn: $("restart-btn"),
  timer: $("timer"),
  liveWpm: $("live-wpm"),
  liveAcc: $("live-acc"),
  liveRaw: $("live-raw"),
  liveErrors: $("live-errors"),
  progressFill: $("progress-fill"),
  progressLabel: $("progress-label"),
  wordCount: $("word-count"),
  textDisplay: $("text-display"),
  focusHint: $("focus-hint"),
  results: $("results"),
  resultBest: $("result-best"),
  resultMeta: $("result-meta"),
  resultWpm: $("result-wpm"),
  resultAcc: $("result-acc"),
  resultConsistency: $("result-consistency"),
  resultRaw: $("result-raw"),
  resultErrors: $("result-errors"),
  resultCorrect: $("result-correct"),
  resultTyped: $("result-typed"),
  cardCanvas: $("card-canvas"),
  downloadBtn: $("download-btn"),
  againBtn: $("again-btn"),
  bestsList: $("bests-list"),
  bestsEmpty: $("bests-empty"),
};

let mode = 60;
let category = "quotes";
let currentEntry = null;
let test = null;
let startTime = null;
let timerId = null;
let lastSampleSecond = 0;
let lastStats = null;
let bests = parseBests(safeGetItem(BESTS_KEY));

function safeGetItem(key) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function safeSetItem(key, value) {
  try { window.localStorage.setItem(key, value); } catch { /* private mode etc: bests just don't persist */ }
}

/* --- Test lifecycle --- */

function loadTest() {
  const bank = bankFor(category);
  currentEntry = pickText(bank, currentEntry ? currentEntry.id : null);
  test = createTest(currentEntry.text, mode);
  startTime = null;
  lastSampleSecond = 0;
  lastStats = null;
  stopTimer();
  els.results.hidden = true;
  els.resultBest.hidden = true;
  renderText();
  updateLive(0);
  els.timer.textContent = String(mode);
  els.timer.classList.remove("hot");
  els.progressFill.style.width = "0%";
  els.progressLabel.textContent = "0% complete";
  els.wordCount.textContent = `${wordCount(currentEntry.text)} words`;
  els.focusHint.textContent = "Click the text above, then just start typing.";
}

function restartTest() {
  // Restart keeps the same text — a fresh attempt at the same words.
  test = createTest(currentEntry.text, mode);
  startTime = null;
  lastSampleSecond = 0;
  lastStats = null;
  stopTimer();
  els.results.hidden = true;
  els.resultBest.hidden = true;
  renderText();
  updateLive(0);
  els.timer.textContent = String(mode);
  els.timer.classList.remove("hot");
  els.progressFill.style.width = "0%";
  els.progressLabel.textContent = "0% complete";
  els.focusHint.textContent = "Click the text above, then just start typing.";
}

function startTimer() {
  startTime = Date.now();
  lastSampleSecond = 0;
  timerId = window.setInterval(tick, 100);
}

function stopTimer() {
  if (timerId !== null) {
    window.clearInterval(timerId);
    timerId = null;
  }
}

function elapsedMs() {
  return startTime === null ? 0 : Date.now() - startTime;
}

function tick() {
  if (!test || test.finished) return;
  const elapsed = elapsedMs();
  const remaining = Math.max(0, Math.ceil((mode * 1000 - elapsed) / 1000));
  els.timer.textContent = String(remaining);
  els.timer.classList.toggle("hot", remaining <= 10);
  const second = Math.floor(elapsed / 1000);
  if (second > lastSampleSecond) {
    // One sample per elapsed second (catches up if a tick was delayed).
    for (let s = lastSampleSecond + 1; s <= second; s += 1) sample(test);
    lastSampleSecond = second;
  }
  updateLive(elapsed);
  if (isComplete(test, elapsed)) finishNow(elapsed);
}

/** Finish the test now (elapsedMs defaults to the real clock). */
function finishNow(ms = null) {
  if (!test || test.finished) return;
  stopTimer();
  const elapsed = ms === null ? elapsedMs() : ms;
  finishTest(test);
  lastStats = computeStats(test, elapsed);
  const { isBest, best } = compareBest(bests, mode, category, lastStats);
  if (isBest) {
    bests = withBest(bests, mode, category, best);
    safeSetItem(BESTS_KEY, JSON.stringify(bests));
  }
  renderResults(lastStats, isBest);
  renderBests();
}

/* --- Input --- */

/** Feed one key into the running test. Used by the keydown listener and by tests. */
function handleKey(key) {
  if (!test || test.finished) return;
  if (key === "Backspace") {
    backspace(test);
  } else if (isPrintableKey(key)) {
    if (startTime === null) startTimer();
    typeChar(test, key);
  } else {
    return;
  }
  paintText();
  updateLive(elapsedMs());
  if (isComplete(test, elapsedMs())) finishNow();
}

document.addEventListener("keydown", (event) => {
  const target = event.target;
  const onButton = target && target.tagName === "BUTTON";
  // Tab restarts any time; Enter restarts once the results are showing.
  if (event.key === "Tab") {
    event.preventDefault();
    restartTest();
    return;
  }
  if (event.key === "Enter" && !els.results.hidden) {
    event.preventDefault();
    restartTest();
    return;
  }
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (onButton) return; // let buttons keep their own keys (Space/Enter activate them)
  if (event.key === "Backspace" || isPrintableKey(event.key)) {
    event.preventDefault();
    handleKey(event.key);
  }
});

els.textDisplay.addEventListener("click", () => els.textDisplay.focus());
els.textDisplay.addEventListener("mousedown", (event) => event.preventDefault());

/* --- Rendering --- */

function renderText() {
  els.textDisplay.innerHTML = "";
  test.chars.forEach((slot, i) => {
    const span = document.createElement("span");
    span.className = "char";
    span.textContent = slot.ch;
    span.dataset.index = String(i);
    els.textDisplay.appendChild(span);
  });
  paintText();
}

function paintText() {
  const spans = els.textDisplay.querySelectorAll(".char");
  spans.forEach((span, i) => {
    const slot = test.chars[i];
    span.classList.toggle("correct", slot.status === "correct");
    span.classList.toggle("incorrect", slot.status === "incorrect");
    span.classList.toggle("current", i === test.index && !test.finished);
  });
  // Extra characters typed past the end, shown after the last char.
  els.textDisplay.querySelectorAll(".char.extra").forEach((el) => el.remove());
  for (let i = 0; i < test.extra; i += 1) {
    const span = document.createElement("span");
    span.className = "char extra";
    span.textContent = "·";
    els.textDisplay.appendChild(span);
  }
  const pct = Math.round((test.index / test.chars.length) * 100);
  els.progressFill.style.width = `${pct}%`;
  els.progressLabel.textContent = `${pct}% complete`;
}

function updateLive(elapsed) {
  const stats = computeStats(test, elapsed);
  els.liveWpm.textContent = String(stats.wpm);
  els.liveRaw.textContent = String(stats.rawWpm);
  els.liveAcc.textContent = stats.typedChars > 0 ? `${stats.accuracy}%` : "—";
  els.liveErrors.textContent = String(stats.errors);
}

function renderResults(stats, isBest) {
  els.results.hidden = false;
  els.resultBest.hidden = !isBest;
  els.resultMeta.textContent = `${mode}s · ${CATEGORY_LABELS[category]} · ${wordCount(currentEntry.text)} words`;
  els.resultWpm.textContent = String(stats.wpm);
  els.resultAcc.textContent = `${stats.accuracy}%`;
  els.resultConsistency.textContent = `${stats.consistency}%`;
  els.resultRaw.textContent = String(stats.rawWpm);
  els.resultErrors.textContent = String(stats.errors);
  els.resultCorrect.textContent = `${stats.correctChars} / ${stats.totalChars}`;
  els.resultTyped.textContent = String(stats.typedChars);
  els.focusHint.textContent = "Press Tab or Enter for another run, or download your card below.";
  try {
    drawResultCard(els.cardCanvas, {
      wpm: stats.wpm,
      rawWpm: stats.rawWpm,
      accuracy: stats.accuracy,
      consistency: stats.consistency,
      errors: stats.errors,
      modeSeconds: mode,
      categoryLabel: CATEGORY_LABELS[category],
      isBest,
    });
  } catch {
    // A canvas failure must never hide the numbers themselves.
  }
  els.results.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderBests() {
  els.bestsList.innerHTML = "";
  const rows = [];
  for (const m of MODES) {
    for (const c of CATEGORIES) {
      const best = getBest(bests, m, c);
      if (best) rows.push({ m, c, best });
    }
  }
  els.bestsEmpty.hidden = rows.length > 0;
  rows.sort((a, b) => a.m - b.m || a.c.localeCompare(b.c));
  for (const { m, c, best } of rows) {
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = `${m}s · ${CATEGORY_LABELS[c]}`;
    const value = document.createElement("span");
    value.className = "best-wpm";
    value.textContent = `${best.wpm} WPM`;
    const meta = document.createElement("span");
    meta.className = "best-meta";
    meta.textContent = `${best.accuracy}% acc · ${best.date}`;
    li.append(label, value, meta);
    els.bestsList.appendChild(li);
  }
}

/* --- Controls --- */

function setMode(next) {
  if (!Object.prototype.hasOwnProperty.call(MODE_SECONDS, next)) return;
  mode = next;
  els.modeRow.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.mode) === mode);
  });
  loadTest();
}

function setCategory(next) {
  if (!CATEGORIES.includes(next)) return;
  category = next;
  els.categoryRow.querySelectorAll(".cat-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.category === category);
  });
  loadTest();
}

els.modeRow.addEventListener("click", (event) => {
  const btn = event.target.closest(".mode-btn");
  if (btn) setMode(Number(btn.dataset.mode));
});
els.categoryRow.addEventListener("click", (event) => {
  const btn = event.target.closest(".cat-btn");
  if (btn) setCategory(btn.dataset.category);
});
els.newTextBtn.addEventListener("click", (event) => { event.currentTarget.blur(); loadTest(); });
els.restartBtn.addEventListener("click", (event) => { event.currentTarget.blur(); restartTest(); });
els.againBtn.addEventListener("click", (event) => { event.currentTarget.blur(); restartTest(); });
els.downloadBtn.addEventListener("click", (event) => {
  event.currentTarget.blur();
  if (!lastStats) return;
  const done = (url) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `typerace-${lastStats.wpm}wpm.png`;
    a.click();
  };
  if (typeof els.cardCanvas.toBlob === "function") {
    els.cardCanvas.toBlob((blob) => {
      if (blob) done(window.URL.createObjectURL(blob));
    }, "image/png");
  } else if (typeof els.cardCanvas.toDataURL === "function") {
    done(els.cardCanvas.toDataURL("image/png"));
  }
});

/* --- Init --- */

function init() {
  renderBests();
  loadTest();
}

init();

export {
  loadTest,
  restartTest,
  handleKey,
  finishNow,
  setMode,
  setCategory,
  getState,
  getLastStats,
  getBests,
};

function getState() {
  return { test, mode, category, entry: currentEntry, started: startTime !== null };
}
function getLastStats() {
  return lastStats;
}
function getBests() {
  return bests;
}
