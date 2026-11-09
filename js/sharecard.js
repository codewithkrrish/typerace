/* TypeRace — result card drawing. Pure canvas API, no DOM lookups except
   the canvas passed in, so it can be exercised with a stub context in Node.
   Card is 1200x630, PixelPress palette, no emojis. */

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

const BG = "#0B0B0F";
const SURFACE = "#121218";
const BORDER = "#23232E";
const TEXT = "#F5F5F7";
const MUTED = "#9A9AA5";
const ACCENT = "#E5484D";

/**
 * Draw the result card onto `canvas` (a <canvas> element, or any object with
 * width/height and getContext("2d")). Returns the canvas.
 * `r` = { wpm, rawWpm, accuracy, consistency, errors, modeSeconds, categoryLabel, isBest }.
 */
export function drawResultCard(canvas, r) {
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");

  // Background + subtle top accent bar.
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.fillStyle = ACCENT;
  ctx.fillRect(0, 0, CARD_WIDTH, 8);

  // Header.
  ctx.fillStyle = TEXT;
  ctx.font = "700 54px Inter, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("TypeRace", 72, 96);
  ctx.fillStyle = MUTED;
  ctx.font = "400 28px Inter, system-ui, sans-serif";
  ctx.fillText(`${r.modeSeconds}s · ${r.categoryLabel}`, 72, 140);

  if (r.isBest) {
    const label = "NEW PERSONAL BEST";
    ctx.font = "700 26px Inter, system-ui, sans-serif";
    const w = ctx.measureText(label).width + 36;
    ctx.fillStyle = ACCENT;
    roundRect(ctx, CARD_WIDTH - 72 - w, 56, w, 52, 26);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.fillText(label, CARD_WIDTH - 72 - w / 2, 90);
    ctx.textAlign = "left";
  }

  // Hero WPM.
  ctx.fillStyle = MUTED;
  ctx.font = "600 26px Inter, system-ui, sans-serif";
  ctx.fillText("WORDS PER MINUTE", 72, 230);
  ctx.fillStyle = ACCENT;
  ctx.font = "800 150px Inter, system-ui, sans-serif";
  ctx.fillText(String(r.wpm), 72, 360);
  ctx.fillStyle = MUTED;
  ctx.font = "400 30px Inter, system-ui, sans-serif";
  ctx.fillText("WPM", 72 + ctx.measureText(String(r.wpm)).width + 24, 360);

  // Stat row: accuracy / consistency / raw WPM / errors.
  const stats = [
    { label: "ACCURACY", value: `${r.accuracy}%` },
    { label: "CONSISTENCY", value: `${r.consistency}%` },
    { label: "RAW WPM", value: String(r.rawWpm) },
    { label: "ERRORS", value: String(r.errors) },
  ];
  const cellW = (CARD_WIDTH - 144) / stats.length;
  stats.forEach((s, i) => {
    const x = 72 + i * cellW;
    ctx.fillStyle = BORDER;
    ctx.fillRect(x, 420, 2, 84);
    ctx.fillStyle = MUTED;
    ctx.font = "600 22px Inter, system-ui, sans-serif";
    ctx.fillText(s.label, x + 22, 452);
    ctx.fillStyle = TEXT;
    ctx.font = "700 44px Inter, system-ui, sans-serif";
    ctx.fillText(s.value, x + 22, 502);
  });

  // Footer.
  ctx.fillStyle = MUTED;
  ctx.font = "400 24px Inter, system-ui, sans-serif";
  ctx.fillText("typerace.vercel.app", 72, 580);
  ctx.textAlign = "right";
  ctx.fillText("WPM = correct chars / 5 / minutes", CARD_WIDTH - 72, 580);
  ctx.textAlign = "left";

  return canvas;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
