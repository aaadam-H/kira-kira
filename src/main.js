import './style.css';
import { AGES, TOPICS, MAX_LEVEL, makeQuestion, makeQuiz } from './questions.js';
import { t, praise } from './i18n.js';
import { load, save } from './storage.js';
import * as sound from './sound.js';
import * as haptics from './haptics.js';
import { initNative } from './native.js';

const QUIZ_LENGTH = 10;
const LEVEL_UP_AFTER = 3;   // betul berturut-turut untuk naik tahap
const LEVEL_DOWN_AFTER = 2; // salah berturut-turut untuk turun tahap
const TILE_COLORS = ['sun', 'sky', 'lilac', 'mint', 'pink'];
// Simbol topik (teks biasa, bukan emoji)
const TOPIC_MARKS = {
  count: '123', add: '+', sub: '−', compare: '&lt; &gt;', times: '×', story: '?',
  mul: '×', div: '÷', fraction: '½', ops: '( )', all: '+ ×',
};

// Ikon dilukis sebagai SVG supaya rupa sama di semua phone
const ICON = {
  star: '<svg viewBox="0 0 40 40" aria-hidden="true"><polygon points="20,3 24.7,14.5 37,15.2 27.5,23 30.5,35 20,28.3 9.5,35 12.5,23 3,15.2 15.3,14.5"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.6"/><path d="M12 2.4v2.8M12 18.8v2.8M2.4 12h2.8M18.8 12h2.8M5.2 5.2l2 2M16.8 16.8l2 2M5.2 18.8l2-2M16.8 7.2l2-2"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
};
const SHAPE_SVG = {
  circle: '<circle cx="20" cy="20" r="15"/>',
  star: '<polygon points="20,3 24.7,14.5 37,15.2 27.5,23 30.5,35 20,28.3 9.5,35 12.5,23 3,15.2 15.3,14.5"/>',
  square: '<rect x="6" y="6" width="28" height="28" rx="4"/>',
  triangle: '<polygon points="20,5 36,34 4,34"/>',
};

function shapesHTML(v) {
  const one = `<svg class="shape" viewBox="0 0 40 40" aria-hidden="true">${SHAPE_SVG[v.shape]}</svg>`;
  return v.groups
    .map((n) => `<span class="shape-group" style="--c:var(--${v.color})">${one.repeat(n)}</span>`)
    .join('<span class="shape-plus">+</span>');
}

// Blok bertingkat: 1, 2, 3 blok ikut kumpulan umur
function ageBlocks(n) {
  const rects = Array.from({ length: n }, (_, i) =>
    `<rect x="${14 + (i % 2) * 4}" y="${50 - (i + 1) * 15}" width="32" height="13" rx="3"/>`).join('');
  return `<svg class="age-blocks" viewBox="0 0 64 56" aria-hidden="true">${rects}</svg>`;
}
const topicMark = (tp) => `<span class="topic-mark" aria-hidden="true">${TOPIC_MARKS[tp]}</span>`;
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const app = document.getElementById('app');
const saved = load();
const state = {
  lang: saved.lang === 'en' ? 'en' : 'ms',
  sound: saved.sound !== false,
  vibrate: saved.vibrate !== false,
  best: saved.best || {},     // markah terbaik setiap age:topic
  levels: saved.levels || {}, // tahap terakhir setiap age:topic
  stats: saved.stats || {},   // { rounds, answered, correct } setiap age:topic
  screen: 'home',
  prevScreen: 'home',
  age: null,
  topic: null,
  current: null,
  seen: new Set(),
  index: 0,
  score: 0,
  streak: 0,
  level: 0,
  upRun: 0,
  downRun: 0,
  leveledUp: false,
  locked: false,
  result: null,
  notice: '',
};
let nextTimer = null;
let introPlayed = false;
sound.setEnabled(state.sound);
haptics.setEnabled(state.vibrate);

const tr = (key, params) => t(state.lang, key, params);
const key = (age = state.age, topic = state.topic) => `${age}:${topic}`;
const persist = () => save({
  lang: state.lang, sound: state.sound, vibrate: state.vibrate,
  best: state.best, levels: state.levels, stats: state.stats,
});

function starsFor(score) {
  const r = score / QUIZ_LENGTH;
  return r >= 0.9 ? 3 : r >= 0.7 ? 2 : r >= 0.4 ? 1 : 0;
}
const totalStars = () => Object.values(state.best).reduce((sum, s) => sum + starsFor(s), 0);

function starRow(n, cls) {
  const stars = [0, 1, 2]
    .map((i) => `<span class="star${i < n ? ' on' : ''}">${ICON.star}</span>`)
    .join('');
  return `<span class="stars ${cls}" role="img" aria-label="${tr('starsLabel', { n })}">${stars}</span>`;
}

function topbar(backTo) {
  return `
  <header class="topbar">
    ${backTo ? `<button class="block pill" data-action="${backTo}">${ICON.back}${tr('back')}</button>` : '<span></span>'}
    <div class="topbar-right">
      <div class="lang-switch" role="group" aria-label="${tr('language')}">
        <button data-action="lang" data-lang="ms" aria-pressed="${state.lang === 'ms'}">BM</button>
        <button data-action="lang" data-lang="en" aria-pressed="${state.lang === 'en'}">EN</button>
      </div>
      ${state.screen !== 'settings' ? `<button class="block icon-btn" data-action="settings" aria-label="${tr('settings')}">${ICON.gear}</button>` : ''}
    </div>
  </header>`;
}

// ---------- skrin ----------
function renderHome() {
  const tiles = (word, offset) =>
    `<span class="word">${[...word]
      .map((ch, i) => `<span class="tile" style="--c:var(--${TILE_COLORS[(i + offset) % TILE_COLORS.length]});--i:${i + offset}">${ch}</span>`)
      .join('')}</span>`;
  const stars = totalStars();

  app.innerHTML = `
    ${topbar(null)}
    <section class="hero">
      <h1 class="logo${introPlayed || reducedMotion ? '' : ' intro'}">
        <span class="sr-only">Kira-Kira!</span>
        <span aria-hidden="true">${tiles('Kira', 0)}${tiles('Kira!', 4)}</span>
      </h1>
      <p class="tagline">${tr('tagline')}</p>
      ${stars > 0 ? `<p class="star-total">${ICON.star}${tr('starsTotal', { n: stars })}</p>` : ''}
    </section>
    <h2 class="section-title">${tr('chooseAge')}</h2>
    <div class="age-list">
      ${AGES.map((a) => `
        <button class="block age-card" data-action="age" data-age="${a.id}" style="--c:var(--${a.color})">
          <span class="age-icon">${ageBlocks(a.blocks)}</span>
          <span class="age-text">
            <strong>${tr(`age_${a.id}`)}</strong>
            <small>${tr(`ageDesc_${a.id}`)}</small>
          </span>
        </button>`).join('')}
    </div>`;
  introPlayed = true;
}

function renderTopics() {
  const age = AGES.find((a) => a.id === state.age);
  const topics = [...TOPICS[state.age], 'all'];
  app.innerHTML = `
    ${topbar('home')}
    <h2 class="screen-title">${tr('chooseTopic')}</h2>
    <p class="screen-sub">${tr(`age_${age.id}`)}</p>
    <div class="topic-grid">
      ${topics.map((tp, i) => {
        const best = state.best[key(state.age, tp)];
        const color = tp === 'all' ? 'card' : TILE_COLORS[i % TILE_COLORS.length];
        return `
        <button class="block topic-btn${tp === 'all' ? ' is-wide' : ''}" data-action="topic" data-topic="${tp}" style="--c:var(--${color})">
          ${topicMark(tp)}
          <span class="topic-name">${tr(`topic_${tp}`)}</span>
          ${best != null ? starRow(starsFor(best), 'small') : `<span class="topic-new">${tr('notPlayed')}</span>`}
        </button>`;
      }).join('')}
    </div>`;
}

function renderGame() {
  const item = state.current;
  const pct = (state.index / QUIZ_LENGTH) * 100;
  const colors = ['sun', 'sky', 'lilac', 'mint'];
  app.innerHTML = `
    <header class="game-top">
      <button class="block icon-btn" data-action="quit" aria-label="${tr('quit')}">${ICON.close}</button>
      <div class="progress" role="progressbar" aria-label="${tr('progress')}"
           aria-valuemin="0" aria-valuemax="${QUIZ_LENGTH}" aria-valuenow="${state.index}">
        <span style="width:${pct}%"></span>
      </div>
      <span class="score-chip" aria-label="${tr('scoreLabel', { n: state.score })}">${ICON.star}<b>${state.score}</b></span>
    </header>
    <section class="block q-card">
      <div class="q-meta">
        <span class="q-count">${tr('questionOf', { n: state.index + 1, total: QUIZ_LENGTH })}</span>
        <span class="level-chip${state.leveledUp ? ' just-up' : ''}">${tr('level', { n: state.level + 1 })}</span>
      </div>
      ${item.visual ? `<div class="q-visual">${shapesHTML(item.visual)}</div>` : ''}
      <p class="q-prompt${item.isText ? ' is-text' : ''}${item.size === 'label' ? ' is-label' : ''}">${item.prompt(state.lang)}</p>
    </section>
    <div class="choices${item.choices.length === 2 ? ' two' : ''}">
      ${item.choices.map((c, i) => `
        <button class="block choice" data-action="answer" data-choice="${c}" style="--c:var(--${colors[i]})">${c}</button>`).join('')}
    </div>
    <p class="feedback" role="status" aria-live="polite"></p>`;
  state.leveledUp = false;
}

function renderResult() {
  const { score, isNew, prev } = state.result;
  const n = starsFor(score);
  const title = n === 3 ? 'resultGreat' : n >= 1 ? 'resultGood' : 'resultTry';
  let bestLine = '';
  if (isNew && prev != null) bestLine = `<p class="badge">${tr('newBest')}</p>`;
  else if (prev != null) bestLine = `<p class="result-best">${tr('best')}: ${prev}/${QUIZ_LENGTH}</p>`;

  app.innerHTML = `
    <section class="result">
      ${starRow(n, 'big')}
      <h2 class="result-title">${tr(title)}</h2>
      <p class="result-score">${tr('scoreOf', { n: score, total: QUIZ_LENGTH })}</p>
      ${bestLine}
      <div class="result-actions">
        <button class="block btn" style="--c:var(--sun)" data-action="again">${tr('playAgain')}</button>
        <button class="block btn" data-action="topics">${tr('changeTopic')}</button>
        <button class="block btn" data-action="home">${tr('home')}</button>
      </div>
    </section>`;
  if (n === 3) confetti();
}

function toggleRow(settingKey, title, desc) {
  const on = state[settingKey];
  return `
    <button class="block toggle-row" role="switch" aria-checked="${on}" data-action="toggle" data-key="${settingKey}">
      <span class="toggle-text">
        <strong>${title}</strong>
        <small>${desc}</small>
      </span>
      <span class="switch" aria-hidden="true"><span></span></span>
      <span class="sr-only">${tr(on ? 'on' : 'off')}</span>
    </button>`;
}

function renderSettings() {
  const progress = AGES.map((a) => {
    const played = [...TOPICS[a.id], 'all'].filter((tp) => state.stats[key(a.id, tp)]?.answered);
    const rows = played.map((tp) => {
      const s = state.stats[key(a.id, tp)];
      const best = state.best[key(a.id, tp)];
      return `
        <li class="progress-row">
          <span class="progress-topic">${topicMark(tp)}${tr(`topic_${tp}`)}</span>
          <span class="progress-detail">
            <span>${tr('accuracy', { p: Math.round((s.correct / s.answered) * 100) })}</span>
            <span class="muted">${tr('answeredCount', { n: s.answered })}</span>
          </span>
          ${best != null ? starRow(starsFor(best), 'small') : '<span class="stars small"></span>'}
        </li>`;
    }).join('');
    return `
      <section class="progress-age">
        <h4>${tr(`age_${a.id}`)}</h4>
        ${rows ? `<ul>${rows}</ul>` : `<p class="muted progress-empty">${tr('notPlayed')}</p>`}
      </section>`;
  }).join('');

  app.innerHTML = `
    ${topbar(state.prevScreen)}
    <h2 class="screen-title">${tr('settings')}</h2>
    <div class="settings-list">
      ${toggleRow('sound', tr('sound'), tr('soundDesc'))}
      ${toggleRow('vibrate', tr('vibrate'), tr('vibrateDesc'))}
    </div>
    <h3 class="sub-title">${tr('progressTitle')}</h3>
    <p class="screen-sub">${tr('progressDesc')}</p>
    <div class="block progress-card">${progress}</div>
    ${state.notice ? `<p class="notice" role="status">${state.notice}</p>` : ''}
    <button class="block btn danger" data-action="reset">${tr('resetTitle')}</button>`;
  state.notice = '';
}

const SCREENS = {
  home: renderHome, topics: renderTopics, game: renderGame, result: renderResult, settings: renderSettings,
};

function render() {
  document.documentElement.lang = state.lang;
  SCREENS[state.screen]();
}

function go(screen) {
  clearTimeout(nextTimer);
  closeModal(false);
  document.querySelectorAll('.confetti').forEach((el) => el.remove());
  state.screen = screen;
  render();
  window.scrollTo(0, 0);
}

// ---------- kotak pengesahan (ganti window.confirm yang disekat dalam iframe/sesetengah WebView) ----------
let modal = null;

function confirmDialog({ title, body, okLabel, cancelLabel, danger = false }) {
  closeModal(false);
  return new Promise((resolve) => {
    const lastFocus = document.activeElement;
    const el = document.createElement('div');
    el.className = 'modal-backdrop';
    el.innerHTML = `
      <div class="block modal" role="alertdialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-body">
        <h2 id="modal-title" class="modal-title">${title}</h2>
        <p id="modal-body" class="modal-body">${body}</p>
        <div class="modal-actions">
          <button class="block btn" style="--c:var(--sun)" data-modal="cancel">${cancelLabel}</button>
          <button class="block btn${danger ? ' danger' : ''}" data-modal="ok">${okLabel}</button>
        </div>
      </div>`;
    const finish = (value) => {
      el.remove();
      modal = null;
      lastFocus?.focus?.();
      resolve(value);
    };
    el.addEventListener('click', (e) => {
      if (e.target === el) { sound.tap(); finish(false); return; }
      const btn = e.target.closest('[data-modal]');
      if (!btn) return;
      sound.tap();
      finish(btn.dataset.modal === 'ok');
    });
    document.body.appendChild(el);
    modal = { el, finish };
    el.querySelector('[data-modal="cancel"]').focus();
  });
}

function closeModal(value = false) {
  if (modal) modal.finish(value);
}

async function askQuit() {
  const ok = await confirmDialog({
    title: tr('quitTitle'), body: tr('quitBody'), okLabel: tr('stop'), cancelLabel: tr('keepPlaying'),
  });
  if (ok) go('topics');
}

// ---------- logik game ----------
function nextQuestion() {
  state.current = makeQuestion(state.age, state.topic, state.level, state.seen);
}

function startGame() {
  state.seen = new Set();
  state.index = 0;
  state.score = 0;
  state.streak = 0;
  state.upRun = 0;
  state.downRun = 0;
  state.leveledUp = false;
  state.locked = false;
  state.level = state.levels[key()] ?? 0;
  nextQuestion();
  go('game');
}

function adjustLevel(right) {
  if (right) {
    state.upRun++;
    state.downRun = 0;
    if (state.upRun >= LEVEL_UP_AFTER && state.level < MAX_LEVEL) {
      state.level++;
      state.upRun = 0;
      state.leveledUp = true;
    }
  } else {
    state.downRun++;
    state.upRun = 0;
    if (state.downRun >= LEVEL_DOWN_AFTER && state.level > 0) {
      state.level--; // turun senyap-senyap, tak perlu beritahu budak
      state.downRun = 0;
    }
  }
}

function answer(btn) {
  if (state.locked) return;
  state.locked = true;
  const item = state.current;
  const right = btn.dataset.choice === item.answer;

  app.querySelectorAll('.choice').forEach((b) => {
    b.disabled = true;
    if (b.dataset.choice === item.answer) b.classList.add('is-right');
    else if (b === btn) b.classList.add('is-wrong');
    else b.classList.add('is-dim');
  });

  const s = (state.stats[key()] ||= { rounds: 0, answered: 0, correct: 0 });
  s.answered++;
  if (right) s.correct++;

  adjustLevel(right);
  const fb = app.querySelector('.feedback');
  if (right) {
    state.score++;
    state.streak++;
    sound.correct();
    haptics.buzz('right');
    if (state.leveledUp) sound.levelUp();
    if (state.leveledUp) fb.textContent = tr('levelUp');
    else fb.textContent = state.streak >= 3 ? tr('streak', { n: state.streak }) : praise(state.lang);
  } else {
    state.streak = 0;
    sound.wrong();
    haptics.buzz('wrong');
    fb.textContent = tr('wrong', { a: item.answer });
  }
  fb.classList.add(right ? 'good' : 'bad');
  app.querySelector('.score-chip b').textContent = state.score;
  persist();

  nextTimer = setTimeout(() => {
    state.index++;
    state.locked = false;
    if (state.index >= QUIZ_LENGTH) finish();
    else {
      nextQuestion();
      render();
    }
  }, right ? 1000 : 1800);
}

function finish() {
  const k = key();
  const prev = state.best[k];
  const isNew = prev == null || state.score > prev;
  if (isNew) state.best[k] = state.score;
  state.levels[k] = state.level;
  state.stats[k].rounds++;
  persist();
  state.result = { score: state.score, isNew, prev };
  if (starsFor(state.score) === 3) sound.fanfare();
  go('result');
}

function confetti() {
  if (reducedMotion) return;
  const layer = document.createElement('div');
  layer.className = 'confetti';
  layer.setAttribute('aria-hidden', 'true');
  const colors = ['var(--sun)', 'var(--sky)', 'var(--lilac)', 'var(--mint)', 'var(--pink)'];
  for (let i = 0; i < 44; i++) {
    const p = document.createElement('i');
    p.style.setProperty('--x', `${Math.random() * 100}vw`);
    p.style.setProperty('--d', `${Math.random() * 0.6}s`);
    p.style.setProperty('--r', `${Math.random() * 720 - 360}deg`);
    p.style.setProperty('--c', colors[i % colors.length]);
    p.style.setProperty('--s', `${8 + Math.random() * 8}px`);
    layer.appendChild(p);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 3200);
}

// ---------- event ----------
app.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn || btn.disabled) return;
  const action = btn.dataset.action;
  if (action !== 'answer') sound.tap();

  switch (action) {
    case 'lang':
      state.lang = btn.dataset.lang;
      persist();
      render();
      break;
    case 'settings':
      state.prevScreen = state.screen;
      go('settings');
      break;
    case 'toggle': {
      const k = btn.dataset.key;
      state[k] = !state[k];
      sound.setEnabled(state.sound);
      haptics.setEnabled(state.vibrate);
      if (k === 'vibrate' && state.vibrate) haptics.buzz('right');
      persist();
      render();
      app.querySelector(`[data-key="${k}"]`)?.focus();
      break;
    }
    case 'reset':
      confirmDialog({
        title: tr('resetTitle'), body: tr('resetConfirm'), okLabel: tr('delete'), cancelLabel: tr('cancel'), danger: true,
      }).then((ok) => {
        if (!ok) return;
        state.best = {};
        state.levels = {};
        state.stats = {};
        state.notice = tr('resetDone');
        persist();
        render();
      });
      break;
    case 'age':
      state.age = btn.dataset.age;
      go('topics');
      break;
    case 'topic':
      state.topic = btn.dataset.topic;
      startGame();
      break;
    case 'answer':
      answer(btn);
      break;
    case 'quit':
      askQuit();
      break;
    case 'again':
      startGame();
      break;
    case 'topics':
      go('topics');
      break;
    case 'home':
      go('home');
      break;
  }
});

// Butang "back" Android: undur satu skrin, keluar (minimize) dari menu utama
function handleBack() {
  if (modal) {
    closeModal(false); // back semasa kotak pengesahan terbuka = batal
    return null;
  }
  switch (state.screen) {
    case 'home':
      return 'exit';
    case 'topics':
      go('home');
      break;
    case 'settings':
      go(state.prevScreen);
      break;
    case 'result':
      go('topics');
      break;
    case 'game':
      askQuit();
      break;
  }
  return null;
}
initNative({ onBack: handleBack, onPause: sound.suspend });

// Untuk test di komputer: tekan 1–4 untuk jawab
window.addEventListener('keydown', (e) => {
  if (modal) {
    if (e.key === 'Escape') closeModal(false);
    if (e.key === 'Tab') {
      // kekalkan fokus dalam kotak pengesahan
      const btns = [...modal.el.querySelectorAll('button')];
      const i = btns.indexOf(document.activeElement);
      e.preventDefault();
      btns[(i + (e.shiftKey ? -1 : 1) + btns.length) % btns.length].focus();
    }
    return;
  }
  if (e.key === 'Escape' && state.screen === 'game') {
    askQuit();
    return;
  }
  if (state.screen !== 'game' || state.locked) return;
  const n = Number(e.key);
  const buttons = app.querySelectorAll('.choice');
  if (n >= 1 && n <= buttons.length) buttons[n - 1].click();
});

// Untuk debug dalam browser (npm run dev sahaja): buka console dan taip `kiraKira`
if (import.meta.env.DEV) {
  window.kiraKira = {
    state,
    makeQuiz,
    answer: () => console.log(state.current?.answer),
    setLevel: (n) => { state.level = Math.max(0, Math.min(MAX_LEVEL, n)); nextQuestion(); render(); },
    sample: (age, topic, lvl = 0) => console.table(makeQuiz(age, topic, 10, lvl).map((q) => ({ soalan: q.prompt(state.lang), jawapan: q.answer, pilihan: q.choices.join(', ') }))),
  };
}

render();
