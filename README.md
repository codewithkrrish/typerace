# TypeRace

I built TypeRace because I kept opening typing-test sites that wanted an account, showed me ads, or quietly sent my keystrokes to a server. This one does none of that. It is a typing speed test that lives entirely in your browser: pick a time limit, type the text on screen, and get your WPM, accuracy and a result card you can download. Nothing you type ever leaves the page.

## How it works

1. Choose a time limit — 15, 30, 60 or 120 seconds — and a text type: quotes, code snippets, or pangrams.
2. Just start typing. The clock starts on your first keypress, and every character lights up green or red as you go, with a caret showing where you are.
3. While you type you see live WPM, accuracy, raw WPM, error count and the time left, plus a progress bar.
4. When the timer ends (or you finish the text), you get the full breakdown — WPM, accuracy, consistency, correct and incorrect characters — and a result card you can download as a PNG.

Your best score for each time limit and text type is saved in localStorage, so it is still there next time you open the page on the same browser. Press Tab to restart at any point, or Enter once your result is showing.

## The honest limitations

- **WPM means correct characters only.** A "word" is 5 characters, so WPM = (correct characters ÷ 5) ÷ minutes. Raw WPM, shown next to it, counts everything you typed — the gap between the two is your typo rate. If you were expecting a higher number elsewhere, that is probably why.
- **Consistency is a rough measure**, not a lab metric. It compares how steady your per-second speed was; a perfectly flat pace scores near 100%.
- **The texts are a fixed bank**, not generated. Twelve quotes, ten code snippets, eight pangrams. You will see repeats if you run it a lot — the shuffle avoids showing the same text twice in a row, but that is the whole trick.
- **Code snippets are typed as shown**, including brackets and semicolons. If you are used to typing prose, the code category will feel slower, and that is the point.
- **Best scores live in one browser only.** There is no account, no sync and no leaderboard, so a new device or cleared browser data starts you from zero.
- **No mobile keyboard magic.** It works on phones, but a physical keyboard is where the numbers mean anything.

## Running it locally

No build step, no dependencies to install. Serve the folder over HTTP (ES modules need a real origin, `file://` will not do) and open `index.html`:

```sh
python3 -m http.server 8000
```

Then visit http://localhost:8000.

## Technical notes

- `js/engine.js` — the pure logic: the character state machine (correct / incorrect / extra / backspace), WPM and accuracy maths, consistency from per-second samples, and personal-best comparison. No DOM, no clock, fully unit-tested.
- `js/texts.js` — the quote, code and pangram banks, each entry with a stable id so the picker can avoid immediate repeats.
- `js/sharecard.js` — draws the 1200×630 result card on a canvas (PixelPress palette, no emojis), including the "New personal best" badge when you beat one.
- `js/main.js` — the DOM wiring: key handling (typing starts on first keypress, Tab restarts), the timer, live stats, mode and category switching, bests list, card download.

## Privacy

Your typing is processed locally in your browser and never uploaded or stored anywhere. The only thing saved is your best WPM per time limit and text type, in your own browser's localStorage.
