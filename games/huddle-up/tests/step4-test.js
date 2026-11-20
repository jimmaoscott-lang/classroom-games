// Headless checks for build step 4: injuries, trainer icon, guess flags, breaks, spending, computer points.
// Run from games/huddle-up:  node tests/step4-test.js [outdir]
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const out = process.argv[2] || '/tmp';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + path.resolve('game/index.html') + '?len=Quick');
  await page.click('#kick');
  let lastW = -1; // vary the position so slow misses never trip the same-position guess rule
  const wrong = async () => { lastW = await page.evaluate(l => { const w = G.q.choices.map((c, i) => c.right ? -1 : i).filter(i => i >= 0 && i !== l); return w[0]; }, lastW); return lastW; };
  const right = () => page.evaluate(() => G.q.choices.findIndex(c => c.right));
  // 1) injury after 3 wrong in a row (slow answers so no guess flag)
  await page.evaluate(() => { G.points = 0; POS.forEach(p => { G.ratings.home[p].now = G.ratings.home[p].start + 6; }); });
  await page.click('[data-call="Run Inside"]');
  await page.evaluate(() => G.clockStart = -1e9); await page.click(`.choice[data-i="${await wrong()}"]`); await page.click('#hNext');
  await page.evaluate(() => G.clockStart = -1e9); await page.click(`.choice[data-i="${await wrong()}"]`);
  ok(await page.evaluate(() => G.streak === 2), 'streak counts 2 wrong');
  await page.click('#hNext'); // delay of game
  await page.click('#nextBtn');
  await page.click('[data-call="Short Pass"]');
  await page.evaluate(() => G.clockStart = -1e9); await page.click(`.choice[data-i="${await wrong()}"]`);
  const fb = await page.textContent('#fb');
  const hurt = await page.evaluate(() => POS.filter(p => G.ratings.home[p].hurt));
  ok(hurt.length === 1 && /shaken up/.test(fb), 'third wrong in a row shakes up one player: ' + hurt + ' | ' + fb);
  ok(await page.evaluate(p => effRating('home', p) === G.ratings.home[p].start, hurt[0]), 'hurt player plays at starting rating');
  ok(await page.evaluate(() => G.log.every(e => !e.guess)), 'slow wrong answers are not guess-flagged');
  await page.click('#hNext'); await page.evaluate(() => G.clockStart = -1e9); await page.click(`.choice[data-i="${await right()}"]`);
  ok(await page.evaluate(() => G.streak === 0), 'right answer resets the streak');
  await page.click('#hNext');
  await page.waitForFunction(() => G.mode === 'result', null, { timeout: 20000 });
  ok(await page.evaluate(p => G.ratings.home[p].hurt === 2, hurt[0]), 'injury counts down after the play');
  await page.click('#nextBtn'); await page.waitForTimeout(400);
  if (await page.evaluate(() => G.mode === 'break')) await page.click('#bkDone');
  await page.evaluate(() => { const p = POS.find(q => G.ratings.home[q].hurt); }); await page.waitForTimeout(500);
  await page.screenshot({ path: out + '/s4-trainer-field.png' });
  ok(await page.isVisible('#trainer.show'), 'trainer chip shows in the panel');
  // 2) guess flag: 3 fast wrong answers -> lock, flagged out of % correct
  await page.evaluate(() => { G.wrongRun = []; G.streak = 0; G.mode = 'call'; showCalls(); });
  const call = await page.$('[data-call]'); await call.click();
  for (let k = 0; k < 3; k++) {
    await page.evaluate(() => G.clockStart = performance.now()); await page.click(`.choice[data-i="${await wrong()}"]`);
    if (k < 2) { await page.click('#hNext'); await page.waitForTimeout(300); if (await page.evaluate(() => G.mode === 'result')) { await page.click('#nextBtn'); await page.waitForTimeout(300); if (await page.evaluate(() => G.mode === 'break')) await page.click('#bkDone'); const b = await page.$('[data-call]'); await b.click(); } }
  }
  await page.waitForTimeout(300); await page.screenshot({ path: out + '/s4-lock.png' });
  ok(await page.isVisible('#lock.on'), 'lock screen shows after 3 fast wrong answers');
  ok(await page.evaluate(() => G.log.filter(e => e.guess).length === 3), 'those 3 answers are guess-flagged');
  await page.waitForFunction(() => !document.querySelector('#lock.on'), null, { timeout: 8000 });
  ok(true, 'lock clears after 5 seconds');
  // 3) break screen: spend points, cap at 100, computer gets points
  await page.evaluate(() => { closeHuddle(); G.points = 3; G.ratings.home.QB.now = 99; G.ratings.home.QB.start = 64; G.play = PLAYS_PER_QUARTER; G.mode = 'result'; });
  const cpuBefore = await page.evaluate(() => POS.reduce((n, p) => n + G.ratings.away[p].now, 0));
  await page.evaluate(() => afterResult());
  ok(await page.evaluate(() => G.mode === 'break'), 'end of quarter opens the break');
  const cpuAfter = await page.evaluate(() => POS.reduce((n, p) => n + G.ratings.away[p].now, 0));
  ok(cpuAfter - cpuBefore === 4 * 2, `computer spent 4 points at Normal (+${cpuAfter - cpuBefore} rating)`);
  await page.click('.pcard[data-p="QB"]'); await page.click('#plusBtn');
  ok(await page.evaluate(() => G.ratings.home.QB.now === 100 && G.points === 2), 'QB capped at 100');
  ok(await page.isDisabled('#plusBtn'), '+1 disabled at 100');
  await page.click('.pcard[data-p="RB"]'); const rb = await page.evaluate(() => G.ratings.home.RB.now); await page.click('#plusBtn');
  ok(await page.evaluate(r => G.ratings.home.RB.now === r + 2 && G.points === 1, rb), '+1 adds 2 rating');
  await page.screenshot({ path: out + '/s4-break.png' });
  await page.click('#bkDone');
  ok(await page.evaluate(() => G.mode === 'call' || G.mode === 'cpuPunt'), 'back to the game');
  // 4) first-miss rating penalty never drops below the start
  const floor = await page.evaluate(() => { let okk = true; for (let k = 0; k < 200; k++) { G.offCall = 'Run Inside'; G.mods = {}; G.points = 0; firstMissPenalty(true); POS.forEach(p => { if (G.ratings.home[p].now < G.ratings.home[p].start) okk = false; }); } return okk; });
  ok(floor, 'ratings never drop below their starting value');
  // 5) halftime break title
  await page.evaluate(() => { G.play = PLAYS_PER_GAME / 2; G.halftimeDone = false; G.mode = 'result'; afterResult(); });
  ok(await page.textContent('#bkTitle') === 'Halftime' && await page.evaluate(() => G.poss === 'away'), 'halftime break, Comets get the ball');
  await page.click('#bkDone');
  ok(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await browser.close(); process.exit(fails ? 1 : 0);
})();
