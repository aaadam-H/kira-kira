// Semak semua penjana soalan pada setiap tahap:
// jawapan betul, jawapan ada dalam pilihan, pilihan unik, tiada nombor negatif, teks diterjemah.
import { TOPICS, MAX_LEVEL, makeQuiz } from '../src/questions.js';

let checked = 0;
const errors = [];
const evalExpr = (s) => Function(`return ${s.replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/')}`)();

for (const age of Object.keys(TOPICS)) {
  for (const topic of [...TOPICS[age], 'all']) {
    for (let lvl = 0; lvl <= MAX_LEVEL; lvl++) {
      for (let round = 0; round < 150; round++) {
        for (const q of makeQuiz(age, topic, 10, lvl)) {
          checked++;
          const en = q.prompt('en');
          const where = `${age}/${topic}/L${lvl}: ${q.prompt('ms')}`;
          if (!q.choices.includes(q.answer)) errors.push(`Jawapan tiada dalam pilihan -> ${where}`);
          if (new Set(q.choices).size !== q.choices.length) errors.push(`Pilihan berulang -> ${where} ${q.choices}`);
          if (![2, 4].includes(q.choices.length)) errors.push(`Bilangan pilihan salah -> ${where}`);
          if (q.choices.some((c) => c.startsWith('-') || /\/0$/.test(c) || c.startsWith('0/'))) errors.push(`Pilihan tak sah -> ${where} ${q.choices}`);
          if (q.isText && en === q.prompt('ms')) errors.push(`Belum diterjemah -> ${where}`);

          const eq = en.match(/^([\d\s+−×÷()]+) = \?$/);
          if (eq && String(evalExpr(eq[1])) !== q.answer) errors.push(`Jawapan salah -> ${where} = ${q.answer}`);
          const fr = en.match(/^(\d+)\/(\d+) ([+−]) (\d+)\/\2 = \?$/);
          if (fr) {
            const top = fr[3] === '+' ? +fr[1] + +fr[4] : +fr[1] - +fr[4];
            if (`${top}/${fr[2]}` !== q.answer || top <= 0) errors.push(`Pecahan salah -> ${where}`);
          }
          const of = en.match(/^(\d+)\/(\d+) of (\d+) = \?$/);
          if (of && String((+of[1] * +of[3]) / +of[2]) !== q.answer) errors.push(`Pecahan salah -> ${where}`);

          const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;
          if (['ms', 'en'].some((l) => emoji.test(q.prompt(l))) || q.choices.some((c) => emoji.test(c))) errors.push(`Ada emoji -> ${where}`);
          if (q.visual && q.visual.groups.reduce((x, y) => x + y, 0) > 10) errors.push(`Terlalu banyak bentuk -> ${where}`);
        }
      }
    }
  }
}
console.log(`${checked} soalan disemak.`);
if (errors.length) {
  console.log([...new Set(errors)].slice(0, 20).join('\n'));
  process.exit(1);
}
console.log('Semua OK ✅');
