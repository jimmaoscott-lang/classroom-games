// Headless checks for build step 5: the solo computer coach.
// Run from games/huddle-up:  node tests/step5-test.js [outdir]
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const out = process.argv[2] || '/tmp';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + path.resolve('game/index.html'));
  // settings pickers
  ok(await page.evaluate(() => LENGTH === 'Standard' && PLAYS_PER_QUARTER === 12 && DIFF === 'Normal'), 'defaults: Standard game, Normal computer');
  await page.selectOption('#optLen', 'Quick'); await page.selectOption('#optDiff', 'Easy');
  ok(await page.evaluate(() => PLAYS_PER_GAME === 24 && CPU_MISS === 0.4 && CPU_BREAK_POINTS === 2), 'pickers set Quick and Easy');
  ok((await page.textContent('#lenTxt')).includes('6 plays'), 'title text shows the game length');
  await page.screenshot({ path: out + '/s5-title.png' });
  await page.click('#kick');
  // tendency reads (Monte Carlo over the pick functions)
  const r = await page.evaluate(() => {
    const count = (fn, n) => { const c = {}; for (let i = 0; i < n; i++) { const k = fn(); c[k] = (c[k] || 0) + 1; } return c; };
    G.down = 1; G.toGo = 10; G.ballX = 40; G.poss = 'home'; G.play = 2;
    G.hist.off = []; const plain = count(cpuDefense, 4000);
    G.hist.off = Array(6).fill('Run Inside'); const keyed = count(cpuDefense, 4000);
    G.poss = 'away'; G.ballX = 60;
    G.hist.def = []; const oPlain = count(cpuOffense, 4000);
    G.hist.def = Array(6).fill('Blitz'); const oKeyed = count(cpuOffense, 4000);
    // late and behind / ahead
    G.hist.def = []; G.play = PLAYS_PER_GAME - 3; G.score = { home: 14, away: 7 }; const behind = count(cpuOffense, 4000);
    G.score = { home: 7, away: 14 }; const ahead = count(cpuOffense, 4000);
    const runs = c => ((c['Run Inside'] || 0) + (c['Run Outside'] || 0)) / 4000;
    // 4th down
    const fourth = [];
    const t = (play, h, a, toGo, x) => { G.play = play; G.score = { home: h, away: a }; G.toGo = toGo; G.ballX = x; return cpuGoesForIt(); };
    fourth.push(['early 4th & 1 midfield', t(4, 0, 0, 1, 50), true]);
    fourth.push(['early 4th & 8 own 30', t(4, 0, 0, 8, 70), false]);
    fourth.push(['late behind 4th & 7', t(PLAYS_PER_GAME - 2, 14, 7, 7, 60), true]);
    fourth.push(['late ahead 4th & 2', t(PLAYS_PER_GAME - 2, 7, 14, 2, 60), false]);
    fourth.push(['last play tied 4th & 15', t(PLAYS_PER_GAME - 1, 7, 7, 15, 70), true]);
    return { stack: [plain['Stack the Box'] / 4000, keyed['Stack the Box'] / 4000], blitzBeat: [((oPlain['Short Pass'] || 0) + (oPlain['Run Outside'] || 0)) / 4000, ((oKeyed['Short Pass'] || 0) + (oKeyed['Run Outside'] || 0)) / 4000], behind: runs(behind), ahead: runs(ahead), fourth };
  });
  ok(r.stack[1] > r.stack[0] * 1.6, `defense keys on Run Inside: Stack the Box ${Math.round(r.stack[0] * 100)}% -> ${Math.round(r.stack[1] * 100)}%`);
  ok(r.blitzBeat[1] > r.blitzBeat[0] * 1.3, `offense beats a Blitz habit: Short Pass + Run Outside ${Math.round(r.blitzBeat[0] * 100)}% -> ${Math.round(r.blitzBeat[1] * 100)}%`);
  ok(r.ahead > r.behind * 1.8, `late game: runs ${Math.round(r.behind * 100)}% when behind, ${Math.round(r.ahead * 100)}% when ahead`);
  r.fourth.forEach(([m, got, want]) => ok(got === want, `4th down ${m}: ${got ? 'go' : 'punt'}`));
  // huddle miss rates by difficulty
  const rates = await page.evaluate(() => {
    const res = {};
    for (const d of ['Easy', 'Normal', 'Hard', 'Expert']) {
      applySettings('Quick', d); let miss1 = 0, miss2 = 0; const n = 4000;
      for (let i = 0; i < n; i++) { G.mods = {}; G.offCall = 'Run Inside'; G.defCall = 'Zone'; G.cpuStreak = 0; const h = cpuHuddle('defense'); if (h.q !== 'clean') miss1++; if (h.q === 'blown') miss2++; }
      POS.forEach(p => G.ratings.away[p].hurt = 0);
      res[d] = [miss1 / n, miss2 / n];
    }
    applySettings('Quick', 'Normal'); return res;
  });
  const want = { Easy: 0.4, Normal: 0.25, Hard: 0.1, Expert: 0 };
  for (const d in want) ok(Math.abs(rates[d][0] - want[d]) < 0.03 && Math.abs(rates[d][1] - want[d] * want[d]) < 0.03, `${d}: misses first question ${Math.round(rates[d][0] * 100)}%, both ${Math.round(rates[d][1] * 100)}%`);
  // computer offense misses twice -> Comets delay of game; streak -> Comets injury
  await page.evaluate(() => { G.mode = 'result'; G.poss = 'away'; G.ballX = 60; G.down = 1; G.toGo = 10; G.hist.def = []; CPU_MISS = 1; G.cpuStreak = 1; setFormation(); showCalls(); });
  await page.click('[data-call="Zone"]');
  ok(await page.evaluate(() => G.cpuQ === 'delay'), 'computer missed both questions on offense');
  ok(await page.evaluate(() => POS.some(p => G.ratings.away[p].hurt)), 'computer streak shakes up a Comets player');
  const idx = await page.evaluate(() => G.q.choices.findIndex(c => c.right));
  await page.evaluate(() => G.clockStart = -1e9); await page.click(`.choice[data-i="${idx}"]`); await page.click('#hNext');
  await page.waitForTimeout(400);
  const b = await page.evaluate(() => [document.querySelector('#b1').textContent, document.querySelector('#b2').textContent, G.ballX, G.down]);
  ok(/Comets Delay of game/.test(b[0]) && b[2] === 65 && b[3] === 1, 'Comets get a 5-yard delay of game: ' + b.join(' | '));
  await page.screenshot({ path: out + '/s5-cpu-delay.png' });
  ok(await page.isVisible('#trainer.show') && /Comets/.test(await page.textContent('#trainerTxt')), 'trainer chip shows the Comets injury');
  await page.evaluate(() => { CPU_MISS = 0.25; });
  ok(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await browser.close(); process.exit(fails ? 1 : 0);
})();
