// Penjana soalan. Setiap soalan dijana secara rawak, jadi tak pernah habis.
// Setiap penjana terima `lvl` (0 = mudah, 1 = sederhana, 2 = mencabar).
// Bentuk soalan: { prompt(lang), answer, choices, visual?, isText?, size? }
// visual = { shape, color, groups: [n, ...] } dilukis sebagai SVG oleh main.js

export const MAX_LEVEL = 2;

export const AGES = [
  { id: 'young', blocks: 1, color: 'sun' },   // 4–6 tahun
  { id: 'middle', blocks: 2, color: 'sky' },  // 7–9 tahun
  { id: 'older', blocks: 3, color: 'lilac' }, // 10–12 tahun
];

export const TOPICS = {
  young: ['count', 'add', 'sub', 'compare'],
  middle: ['add', 'sub', 'times', 'story'],
  older: ['mul', 'div', 'fraction', 'ops'],
};

// ---------- helper ----------
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const byLevel = (lvl, options) => options[Math.min(Math.max(lvl, 0), options.length - 1)];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function nearbyNumbers(answer, { min = 0, spread = 4, count = 4 } = {}) {
  const set = new Set([answer]);
  let guard = 0;
  while (set.size < count && guard++ < 200) {
    const v = answer + rand(1, spread) * (Math.random() < 0.5 ? -1 : 1);
    if (v >= min) set.add(v);
  }
  let fill = answer + 1;
  while (set.size < count) set.add(fill++);
  return [...set];
}

// Pilihan jawapan: guna "kesilapan biasa" dulu, kemudian isi dengan nombor berdekatan
function choicesFrom(answer, candidates = [], opts = {}) {
  const set = new Set([String(answer)]);
  for (const c of shuffle(candidates)) {
    if (set.size >= 4) break;
    if (typeof c === 'number' && (c < (opts.min ?? 0) || !Number.isInteger(c))) continue;
    set.add(String(c));
  }
  if (set.size < 4 && typeof answer === 'number') {
    for (const v of shuffle(nearbyNumbers(answer, opts))) {
      if (set.size >= 4) break;
      set.add(String(v));
    }
  }
  return shuffle([...set]);
}

const same = (text) => () => text;
const q = (prompt, answer, choices, extra = {}) => ({ prompt, answer: String(answer), choices, ...extra });
const tens = (ans) => [ans + 1, ans - 1, ans + 10, ans - 10];

export const SHAPES = [
  { id: 'circle', color: 'sun', ms: 'bulatan', en: 'circles' },
  { id: 'star', color: 'pink', ms: 'bintang', en: 'stars' },
  { id: 'square', color: 'sky', ms: 'segi empat', en: 'squares' },
  { id: 'triangle', color: 'mint', ms: 'segi tiga', en: 'triangles' },
];
const NAMES = ['Ali', 'Mei Ling', 'Muthu', 'Siti', 'Adam', 'Aina'];
const ITEMS = [
  { ms: 'guli', en: 'marbles' },
  { ms: 'epal', en: 'apples' },
  { ms: 'buku', en: 'books' },
  { ms: 'gula-gula', en: 'sweets' },
  { ms: 'pensel', en: 'pencils' },
];

// ---------- 4–6 tahun ----------
const young = {
  count(lvl) {
    const [lo, hi] = byLevel(lvl, [[1, 5], [3, 8], [5, 10]]);
    const n = rand(lo, hi);
    const sh = pick(SHAPES);
    return q(
      (l) => (l === 'ms' ? `Berapa banyak ${sh.ms}?` : `How many ${sh.en} are there?`),
      n, choicesFrom(n, [], { min: 1, spread: 3 }),
      { visual: { shape: sh.id, color: sh.color, groups: [n] }, size: 'label' },
    );
  },
  add(lvl) {
    const max = byLevel(lvl, [5, 8, 10]);
    const a = rand(1, max - 1), b = rand(1, max - a);
    const sh = pick(SHAPES);
    return q(same(`${a} + ${b} = ?`), a + b, choicesFrom(a + b, [], { spread: 3 }),
      { visual: { shape: sh.id, color: sh.color, groups: [a, b] } });
  },
  sub(lvl) {
    const max = byLevel(lvl, [5, 8, 10]);
    const a = rand(2, max), b = rand(1, a);
    return q(same(`${a} − ${b} = ?`), a - b, choicesFrom(a - b, [a + b], { spread: 3 }));
  },
  compare(lvl) {
    const max = byLevel(lvl, [10, 20, 50]);
    const a = rand(1, max);
    let b = rand(1, max);
    while (b === a) b = rand(1, max);
    const bigger = Math.random() < 0.5;
    return q(
      (l) => (l === 'ms'
        ? `Nombor mana lebih ${bigger ? 'besar' : 'kecil'}?`
        : `Which number is ${bigger ? 'bigger' : 'smaller'}?`),
      bigger ? Math.max(a, b) : Math.min(a, b), shuffle([String(a), String(b)]), { size: 'label' },
    );
  },
};

// ---------- 7–9 tahun ----------
const middle = {
  add(lvl) {
    const [a, b] = byLevel(lvl, [
      () => [rand(10, 50), rand(1, 9)],
      () => { const x = rand(10, 89); return [x, rand(2, 99 - x)]; },
      () => [rand(100, 500), rand(10, 99)],
    ])();
    const ans = a + b;
    return q(same(`${a} + ${b} = ?`), ans, choicesFrom(ans, tens(ans)));
  },
  sub(lvl) {
    const [a, b] = byLevel(lvl, [
      () => { const x = rand(10, 30); return [x, rand(1, 9)]; },
      () => { const x = rand(20, 99); return [x, rand(2, x)]; },
      () => [rand(100, 500), rand(10, 99)],
    ])();
    const ans = a - b;
    return q(same(`${a} − ${b} = ?`), ans, choicesFrom(ans, tens(ans)));
  },
  times(lvl) {
    const t = byLevel(lvl, [() => pick([2, 5, 10]), () => rand(2, 5), () => rand(2, 10)])();
    const n = rand(1, 10), ans = t * n;
    return q(same(`${t} × ${n} = ?`), ans, choicesFrom(ans, [ans + t, ans - t, t + n, ans + 1]));
  },
  story(lvl) {
    const name = pick(NAMES), it = pick(ITEMS), kind = pick(['add', 'sub', 'times']);
    const [lo, hi] = byLevel(lvl, [[3, 20], [10, 50], [50, 200]]);
    if (kind === 'add') {
      const a = rand(lo, hi), b = rand(2, Math.max(3, Math.round(hi / 2))), ans = a + b;
      return q((l) => (l === 'ms'
        ? `${name} ada ${a} ${it.ms}. Dia dapat ${b} lagi. Berapa ${it.ms} ${name} sekarang?`
        : `${name} has ${a} ${it.en} and gets ${b} more. How many ${it.en} does ${name} have now?`),
      ans, choicesFrom(ans, [Math.abs(a - b), ...tens(ans)]), { isText: true });
    }
    if (kind === 'sub') {
      const a = rand(Math.max(lo, 5), hi), b = rand(1, a - 1), ans = a - b;
      return q((l) => (l === 'ms'
        ? `${name} ada ${a} ${it.ms}. Dia beri ${b} kepada kawan. Berapa ${it.ms} yang tinggal?`
        : `${name} has ${a} ${it.en} and gives ${b} to a friend. How many ${it.en} are left?`),
      ans, choicesFrom(ans, [a + b, ...tens(ans)]), { isText: true });
    }
    const t = byLevel(lvl, [() => rand(2, 3), () => rand(2, 5), () => rand(3, 9)])();
    const n = rand(2, 10), ans = t * n;
    return q((l) => (l === 'ms'
      ? `${name} ada ${t} kotak. Setiap kotak ada ${n} ${it.ms}. Berapa semua ${it.ms}?`
      : `${name} has ${t} boxes with ${n} ${it.en} in each box. How many ${it.en} altogether?`),
    ans, choicesFrom(ans, [t + n, ans + t, ans - n, ans + 1]), { isText: true });
  },
};

// ---------- 10–12 tahun ----------
const older = {
  mul(lvl) {
    const [a, b] = byLevel(lvl, [
      () => [rand(2, 9), rand(2, 9)],
      () => (Math.random() < 0.5 ? [rand(2, 12), rand(2, 12)] : [rand(11, 99), rand(2, 9)]),
      () => (Math.random() < 0.5 ? [rand(11, 30), rand(11, 20)] : [rand(100, 999), rand(2, 9)]),
    ])();
    const ans = a * b;
    return q(same(`${a} × ${b} = ?`), ans, choicesFrom(ans, [ans + a, ans - a, ans + 10, ans - 10, ans + 1]));
  },
  div(lvl) {
    const [b, ans] = byLevel(lvl, [
      () => [rand(2, 9), rand(2, 9)],
      () => [rand(2, 12), rand(2, 12)],
      () => [rand(2, 9), rand(11, 40)],
    ])();
    const a = b * ans;
    return q(same(`${a} ÷ ${b} = ?`), ans, choicesFrom(ans, [ans + 1, ans - 1, ans + 2, ans + 10, b], { min: 1 }));
  },
  fraction(lvl) {
    const kind = byLevel(lvl, [
      () => 'of',
      () => pick(['of', 'add']),
      () => pick(['of', 'add', 'sub']),
    ])();
    if (kind === 'of') {
      const d = pick([2, 3, 4, 5, 10]);
      const num = lvl === 0 ? 1 : rand(1, d - 1);
      const k = byLevel(lvl, [() => rand(2, 5), () => rand(2, 10), () => rand(5, 20)])();
      const whole = d * k, ans = num * k;
      return q(
        (l) => (l === 'ms' ? `${num}/${d} daripada ${whole} = ?` : `${num}/${d} of ${whole} = ?`),
        ans, choicesFrom(ans, [k, ans + k, whole - ans, ans - k]),
      );
    }
    const d = rand(4, 12);
    if (kind === 'add') {
      const a = rand(1, d - 2), b = rand(1, d - 1 - a), s = a + b;
      return q(same(`${a}/${d} + ${b}/${d} = ?`), `${s}/${d}`,
        choicesFrom(`${s}/${d}`, [`${s}/${d * 2}`, `${s + 1}/${d}`, `${s - 1}/${d}`, `${a * b}/${d}`]));
    }
    const a = rand(3, d - 1), b = rand(1, a - 1), s = a - b;
    return q(same(`${a}/${d} − ${b}/${d} = ?`), `${s}/${d}`,
      choicesFrom(`${s}/${d}`, [`${s}/${d + d}`, `${s + 1}/${d}`, `${a + b}/${d}`, `${s + 2}/${d}`]));
  },
  ops(lvl) {
    const kinds = byLevel(lvl, [['a+bc'], ['a+bc', '(a+b)c', 'ab-c'], ['(a+b)c', 'ab-c', 'a÷b+c', 'a+bc']]);
    const big = lvl === 2;
    const kind = pick(kinds);
    if (kind === 'a+bc') {
      const a = rand(1, big ? 50 : 20), b = rand(2, 9), c = rand(2, 9), ans = a + b * c;
      return q(same(`${a} + ${b} × ${c} = ?`), ans, choicesFrom(ans, [(a + b) * c, ans + 1, ans - 1, ans + 10]));
    }
    if (kind === '(a+b)c') {
      const a = rand(1, big ? 20 : 9), b = rand(1, 9), c = rand(2, 6), ans = (a + b) * c;
      return q(same(`(${a} + ${b}) × ${c} = ?`), ans, choicesFrom(ans, [a + b * c, ans + c, ans - c, ans + 1]));
    }
    if (kind === 'a÷b+c') {
      const b = rand(2, 9), a = b * rand(2, 12), c = rand(1, 30), ans = a / b + c;
      return q(same(`${a} ÷ ${b} + ${c} = ?`), ans, choicesFrom(ans, [ans + 1, ans - 1, ans + 10, ans - c + 1]));
    }
    const a = rand(2, 9), b = rand(2, 9), c = rand(1, a * b), ans = a * b - c;
    return q(same(`${a} × ${b} − ${c} = ?`), ans, choicesFrom(ans, [a * (b - c), ans + 1, ans - 1, ans + 10]));
  },
};

const GENERATORS = { young, middle, older };

const signature = (item) => `${item.prompt('en')}|${JSON.stringify(item.visual || '')}|${item.answer}`;

// Jana satu soalan; `seen` elak soalan berulang dalam satu pusingan
export function makeQuestion(age, topic, lvl = 0, seen = new Set()) {
  let item;
  for (let i = 0; i < 50; i++) {
    const key = topic === 'all' ? pick(TOPICS[age]) : topic;
    item = GENERATORS[age][key](lvl);
    const sig = signature(item);
    if (!seen.has(sig)) {
      seen.add(sig);
      break;
    }
  }
  return item;
}

export function makeQuiz(age, topic, length = 10, lvl = 0) {
  const seen = new Set();
  return Array.from({ length }, () => makeQuestion(age, topic, lvl, seen));
}
