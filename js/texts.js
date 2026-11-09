/* TypeRace — text banks. Every entry is an { id, text } pair; ids are
   stable so the picker can avoid repeating the same text twice in a row.
   Quotes are public-domain or widely quoted lines kept short enough to type
   in a minute or two; code snippets are short, real-world JS one-liners. */

export const QUOTES = [
  { id: "q1", text: "The best time to plant a tree was twenty years ago. The second best time is now." },
  { id: "q2", text: "It does not matter how slowly you go as long as you do not stop." },
  { id: "q3", text: "Simplicity is the soul of efficiency. A clear mind types faster than busy fingers." },
  { id: "q4", text: "The only way to do great work is to love what you do. If you have not found it yet, keep looking." },
  { id: "q5", text: "Success is not final, failure is not fatal: it is the courage to continue that counts." },
  { id: "q6", text: "Do not wait for the perfect moment. Take the moment and make it perfect, one keystroke at a time." },
  { id: "q7", text: "A journey of a thousand miles begins with a single step, and a fast typist begins with a single key." },
  { id: "q8", text: "What we think, we become. What we practise every day, we eventually master." },
  { id: "q9", text: "The future belongs to those who believe in the beauty of their dreams and the speed of their fingers." },
  { id: "q10", text: "Discipline is choosing between what you want now and what you want most. Type like you mean it." },
  { id: "q11", text: "In the middle of difficulty lies opportunity. Slow down, read the words, and let your hands catch up." },
  { id: "q12", text: "Knowledge is power, but practise is the key that turns knowledge into skill." },
];

export const CODE = [
  { id: "c1", text: "const total = prices.reduce((sum, price) => sum + price, 0);" },
  { id: "c2", text: "function greet(name) { return `Hello, ${name}! Welcome back.`; }" },
  { id: "c3", text: "const active = users.filter((u) => u.online).map((u) => u.name);" },
  { id: "c4", text: "if (score > best) { best = score; localStorage.setItem('best', best); }" },
  { id: "c5", text: "for (let i = 0; i < items.length; i++) { console.log(items[i]); }" },
  { id: "c6", text: "const doubled = numbers.map((n) => n * 2).filter((n) => n > 10);" },
  { id: "c7", text: "async function fetchData(url) { const res = await fetch(url); return res.json(); }" },
  { id: "c8", text: "document.querySelector('#start').addEventListener('click', startTest);" },
  { id: "c9", text: "const sorted = words.sort((a, b) => a.localeCompare(b)).join(', ');" },
  { id: "c10", text: "try { save(data); } catch (err) { console.error('Save failed:', err); }" },
];

export const PANGRAMS = [
  { id: "p1", text: "The quick brown fox jumps over the lazy dog near the quiet river bank." },
  { id: "p2", text: "Pack my box with five dozen liquor jugs and a few extra quiz sheets." },
  { id: "p3", text: "How vexingly quick daft zebras jump when the brown fox runs by." },
  { id: "p4", text: "Bright vixens jump; dozy fowl quack while the lazy dog watches the show." },
  { id: "p5", text: "Jack amazed a few girls by dropping the antique onyx vase with a thud." },
  { id: "p6", text: "Sixty zippers were quickly picked from the woven jute bag by the fox." },
  { id: "p7", text: "A wizard's job is to vex chumps quickly in fog while the clock ticks." },
  { id: "p8", text: "The five boxing wizards jump quickly over the lazy brown dog again." },
];

export const BANKS = { quotes: QUOTES, code: CODE, pangrams: PANGRAMS };

/** Return the bank for a category, falling back to quotes. */
export function bankFor(category) {
  return BANKS[category] || QUOTES;
}
