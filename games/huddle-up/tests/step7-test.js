// Headless checks for build step 7: special teams (kickoff, return, punt, field goal, extra point).
// Run from games/huddle-up:  node tests/step7-test.js [outdir]
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
  ok(await page.evaluate(() => G.pending && G.pending.kind === 'kickoff' && G.pending.kicker === 'away' && G.ballX === 65), 'game opens with a Comets kickoff from their 35');
  ok(/Kick return/.test(await page.textContent('#label')) && await page.isVisible('[data-kick="return"]'), 'Pelicans coach gets the kick return button');
  await page.screenshot({ path: out + '/s7-opening.png' });
  // --- result math (Monte Carlo) ---
  const m = await page.evaluate(() => {
    const N = 3000, R = {};
    const setK = (kind, x) => { G.poss = 'home'; G.ballX = x; G.pending = { kind, kicker: 'home' }; };
    const run = (kind, x, kq, rq, mods) => { setK(kind, x); const a = []; for (let i = 0; i < N; i++) a.push(resolveKick(kind, kq, rq, mods || {})); return a; };
    const frac = (a, f) => a.filter(f).length / a.length, avg = (a, f) => a.reduce((n, r) => n + f(r), 0) / a.length;
    POS.forEach(p => { G.ratings.home[p] = { start: 65, now: 65, hurt: 0 }; G.ratings.away[p] = { start: 65, now: 65, hurt: 0 }; });
    let a = run('kickoff', 35, 'clean', 'clean');
    R.koTB = frac(a, r => r.out === 'touchback'); const ret = a.filter(r => r.out === 'return');
    R.koSpot = avg(ret, r => 35 + r.endU); // ball spot from the kicker's goal line, i.e. receiving team's own yard line = 100 - that
    R.koRetCleanVsBad = [avg(ret, r => r.ret), avg(run('kickoff', 35, 'clean', 'bad').filter(r => r.out === 'return'), r => r.ret)];
    R.koFumbleBad = frac(run('kickoff', 35, 'clean', 'bad').filter(r => r.out === 'return'), r => r.fumble);
    R.koShort = avg(run('kickoff', 35, 'clean', 'clean', { shortKick: true }), r => r.land) - avg(a, r => r.land);
    R.koBad = frac(run('kickoff', 35, 'bad', 'clean'), r => r.out === 'oob');
    a = run('punt', 40, 'clean', 'clean'); R.puntLand = avg(a.filter(r => r.land < 60), r => r.land);
    R.puntOuts = ['return', 'fair', 'downed', 'touchback'].map(o => o + ' ' + Math.round(100 * frac(a, r => r.out === o)) + '%').join(', ');
    a = run('punt', 40, 'bad', 'clean'); R.puntBad = [frac(a, r => r.out === 'blocked'), frac(a, r => r.out === 'shank')];
    for (const [x, lab] of [[83, 'fg34'], [70, 'fg47'], [60, 'fg57']]) R[lab] = frac(run('fg', x, 'clean'), r => r.good);
    R.fg47hard = frac(run('fg', 70, 'clean', null, { shortKick: true }), r => r.good);
    R.fg47bad = frac(run('fg', 70, 'bad'), r => r.good);
    G.ratings.home.Kicker.now = 100; R.fg57k100 = frac(run('fg', 60, 'clean'), r => r.good); G.ratings.home.Kicker.now = 65;
    R.pat = frac(run('pat', 85, 'clean'), r => r.good);
    return R;
  });
  ok(m.koTB > 0.25 && m.koTB < 0.7, `kickoff touchbacks ${Math.round(m.koTB * 100)}%`);
  ok(m.koSpot > 60 && m.koSpot < 85, `kickoff returns end around the receiving team's ${Math.round(100 - m.koSpot)}`);
  ok(m.koRetCleanVsBad[0] > m.koRetCleanVsBad[1] + 4, `return team huddle matters: ${m.koRetCleanVsBad.map(Math.round).join(' vs ')} yards`);
  ok(m.koFumbleBad > 0.08, `return team misses twice: fumbles ${Math.round(m.koFumbleBad * 100)}%`);
  ok(m.koShort < -7, `first-miss shorter kick: ${Math.round(m.koShort)} yards`);
  ok(m.koBad === 1, 'kicker misses twice: kickoff out of bounds every time');
  ok(m.puntLand > 36 && m.puntLand < 46, `punt distance ${Math.round(m.puntLand)} · ${m.puntOuts}`);
  ok(m.puntBad[0] > .35 && m.puntBad[0] < .55 && m.puntBad[0] + m.puntBad[1] === 1, `punter misses twice: blocked ${Math.round(m.puntBad[0] * 100)}%, shanked ${Math.round(m.puntBad[1] * 100)}%`);
  ok(m.fg34 > .9 && m.fg47 > .4 && m.fg47 < .7 && m.fg57 < .25, `field goals at kicker 65: 34 yd ${Math.round(m.fg34 * 100)}%, 47 yd ${Math.round(m.fg47 * 100)}%, 57 yd ${Math.round(m.fg57 * 100)}%`);
  ok(m.fg47hard < m.fg47 - .15 && m.fg47bad < .2, `47 yd harder kick ${Math.round(m.fg47hard * 100)}%, bad snap ${Math.round(m.fg47bad * 100)}%`);
  ok(m.fg57k100 > m.fg57 + .3, `kicker 100 from 57 yd: ${Math.round(m.fg57k100 * 100)}%`);
  ok(m.pat > .93, `extra points ${Math.round(m.pat * 100)}%`);
  // --- animations for every outcome, both directions ---
  const anim = await page.evaluate(() => {
    const probs = []; let n = 0;
    const cases = [
      ['kickoff', 35, { out: 'touchback', land: 70, landD: .5 }], ['kickoff', 35, { out: 'oob', land: 30, landD: 1.06 }],
      ['kickoff', 35, { out: 'return', land: 62, landD: .5, catchU: 62, endU: 40, ret: 22 }], ['kickoff', 35, { out: 'return', land: 67, landD: .4, catchU: 67, endU: 57, ret: 10 }],
      ['kickoff', 35, { out: 'return', land: 60, landD: .5, catchU: 60, endU: -38, ret: 98, td: true }], ['kickoff', 35, { out: 'return', land: 60, landD: .5, catchU: 60, endU: 35, ret: 25, fumble: true }],
      ['punt', 40, { out: 'return', land: 42, landD: .5, catchU: 42, endU: 32, ret: 10 }], ['punt', 40, { out: 'fair', land: 44, landD: .55 }], ['punt', 60, { out: 'downed', land: 35, landD: .5 }],
      ['punt', 40, { out: 'touchback', land: 64, landD: .5 }], ['punt', 40, { out: 'blocked', endU: -8, landD: .5 }], ['punt', 40, { out: 'shank', land: 18, landD: -0.06 }],
      ['fg', 70, { good: true, dist: 47 }], ['fg', 70, { good: false, miss: 'Wide left', dist: 47 }], ['fg', 60, { good: false, miss: 'Short', dist: 57 }], ['fg', 70, { good: false, miss: 'Bad snap', dist: 47 }], ['pat', 85, { good: true, dist: 32 }],
    ];
    for (const team of ['home', 'away']) for (const [kind, x, r] of cases) {
      G.poss = team; G.ballX = team === 'home' ? x : 100 - x; G.pending = { kind, kicker: team };
      setKickFormation(kind); const res = Object.assign({ kind, kick: true }, r); const P = planKick(res);
      for (let t = 0; t < P.T + 1; t += 0.05) {
        pose(P, t); n++;
        if (G.actors.some(a => !isFinite(a.x) || !isFinite(a.d)) || !isFinite(G.ball.x) || !isFinite(G.ball.h)) { probs.push([team, kind, r.out || r.miss || 'good', 'NaN', t]); break; }
      }
      if (G.actors.length !== 22) probs.push([team, kind, 'players ' + G.actors.length]);
      if (r.out === 'return' && !r.td) { const kr = G.actors.find(a => a.role === 'KR'); pose(P, P.T + .5); if (Math.abs(kr.u - r.endU) > 0.3) probs.push([team, kind, 'returner ends at', kr.u, 'want', r.endU]); }
      if (kind === 'fg' && r.good) { pose(P, P.T - .45); /* ball should be past the posts and high */ const goalX = team === 'home' ? 110 : -10; if (Math.abs(G.ball.x - goalX) > 6) probs.push([team, 'fg ball x', G.ball.x]); }
    }
    G.pending = null; return { probs, n };
  });
  ok(anim.probs.length === 0, `kick animations: ${anim.n} poses, problems: ${JSON.stringify(anim.probs.slice(0, 4))}`);
  // --- flow: opening kickoff return ---
  await page.goto('file://' + path.resolve('game/index.html') + '?len=Quick'); await page.click('#kick');
  const ans = async right => { await page.evaluate(() => G.clockStart = -1e9); const i = await page.evaluate(r => G.q.choices.findIndex(c => r ? c.right : !c.right), right); await page.click(`.choice[data-i="${i}"]`); };
  await page.click('[data-kick="return"]');
  ok(/Return huddle/.test(await page.textContent('#hTitle')), 'return huddle opens');
  await ans(true); ok(await page.evaluate(() => G.points === 2), 'right answer in the return huddle earns +2');
  await page.click('#hNext'); await page.waitForTimeout(1600); await page.screenshot({ path: out + '/s7-kickoff-anim.png' });
  await page.waitForFunction(() => G.mode === 'result', null, { timeout: 15000 });
  await page.screenshot({ path: out + '/s7-kickoff-result.png' });
  const k1 = await page.evaluate(() => ({ poss: G.poss, down: G.down, play: G.play, pend: G.pending, b1: $('#b1').textContent, b2: $('#b2').textContent }));
  ok(k1.play === 0 && !k1.pend && (k1.poss === 'home' || /Fumble/.test(k1.b1)), `kickoff does not count as a play; ${k1.b1} | ${k1.b2}`);
  await page.click('#nextBtn');
  ok(await page.evaluate(() => G.mode === 'call' && !$('#break').classList.contains('show')), 'no break after a kickoff');
  // --- touchdown -> extra point -> kickoff ---
  await page.evaluate(() => { G.poss = 'home'; G.ballX = 95; G.down = 1; G.toGo = 5; setFormation(); showCalls(); });
  await page.click('[data-call="Run Inside"]'); await ans(true);
  await page.evaluate(() => { const real = resolvePlay; window.resolvePlay = (...a) => { const r = real(...a); r.td = true; r.yds = ytg(); r.fumble = false; r.kind = 'run'; window.resolvePlay = real; return r; }; });
  await page.click('#hNext'); await page.waitForFunction(() => G.mode === 'result', null, { timeout: 15000 });
  ok(await page.evaluate(() => G.score.home === 6 && G.pending && G.pending.kind === 'pat'), 'touchdown is worth 6 and the extra point is next');
  ok(await page.textContent('#nextBtn') === 'Extra point', 'button says Extra point');
  await page.click('#nextBtn');
  ok(/Extra point/.test(await page.textContent('#label')) && await page.evaluate(() => G.ballX === 85 && G.poss === 'home'), 'extra point from the 15');
  await page.screenshot({ path: out + '/s7-pat-setup.png' });
  await page.click('[data-kick="pat"]'); await ans(true); await page.click('#hNext');
  await page.waitForTimeout(1500); await page.screenshot({ path: out + '/s7-pat-anim.png' });
  await page.waitForFunction(() => G.mode === 'result', null, { timeout: 15000 });
  const p1 = await page.evaluate(() => ({ s: G.score.home, pend: G.pending, b1: $('#b1').textContent }));
  ok((p1.s === 7 || p1.s === 6) && p1.pend.kind === 'kickoff' && p1.pend.kicker === 'home', `extra point: ${p1.b1}, Pelicans kick off next`);
  await page.click('#nextBtn');
  if (await page.isVisible('#break.show')) { ok(true, 'score break after the extra point'); await page.click('#bkDone'); }
  ok(await page.evaluate(() => G.pending && G.pending.kind === 'kickoff' && G.ballX === 35) && await page.isVisible('[data-kick="kickoff"]'), 'Pelicans kickoff from their 35');
  await page.screenshot({ path: out + '/s7-kickoff-setup.png' });
  // kicker misses twice -> out of bounds, Comets at their 40
  await page.click('[data-kick="kickoff"]'); await ans(false); await page.click('#hNext'); await ans(false);
  ok(/shanked out of bounds/.test(await page.textContent('#fb')), 'second miss on a kickoff: shanked out of bounds');
  await page.click('#hNext'); await page.waitForFunction(() => G.mode === 'result', null, { timeout: 15000 });
  ok(await page.evaluate(() => G.poss === 'away' && G.ballX === 60), 'Comets ball at their 40 after the shank');
  await page.screenshot({ path: out + '/s7-oob.png' });
  await page.click('#nextBtn');
  // --- 4th down field goal ---
  await page.evaluate(() => { G.poss = 'home'; G.ballX = 77; G.down = 4; G.toGo = 6; G.goForIt = false; setFormation(); showCalls(); });
  ok(await page.isEnabled('#fgBtn') && /40 yards/.test(await page.textContent('#fgBtn')), 'Field Goal button shows 40 yards');
  await page.screenshot({ path: out + '/s7-fourth.png' });
  await page.click('#fgBtn'); await page.click('[data-kick="fg"]');
  ok(/Field goal huddle · 40 yards/.test(await page.textContent('#hTitle')), 'field goal huddle');
  const before = await page.evaluate(() => [G.score.home, G.play]);
  await ans(true); await page.click('#hNext'); await page.waitForTimeout(1700); await page.screenshot({ path: out + '/s7-fg-anim.png' });
  await page.waitForFunction(() => G.mode === 'result', null, { timeout: 15000 });
  const f1 = await page.evaluate(() => ({ s: G.score.home, play: G.play, poss: G.poss, x: G.ballX, pend: G.pending, b1: $('#b1').textContent }));
  ok(f1.play === before[1] + 1 && (f1.s === before[0] + 3 ? f1.pend.kind === 'kickoff' : f1.poss === 'away' && f1.x === 80), `field goal counts as a play: ${f1.b1}`);
  await page.screenshot({ path: out + '/s7-fg-result.png' });
  ok(await page.evaluate(() => { G.ballX = 30; G.poss = 'home'; return fgDistance() === 87; }) , 'distance from own 30 is 87');
  await page.evaluate(() => { G.mode = 'result'; G.pending = null; G.poss = 'home'; G.ballX = 30; G.down = 4; G.toGo = 6; G.goForIt = false; setFormation(); showCalls(); });
  ok(!(await page.isEnabled('#fgBtn')) && /Too far/.test(await page.textContent('#fgBtn')), 'Field Goal is off when too far');
  // punt by the student, computer returns
  await page.click('#puntBtn'); ok(/Punt/.test(await page.textContent('#label')), 'punt screen');
  await page.click('[data-kick="punt"]'); await ans(true); await page.click('#hNext');
  await page.waitForTimeout(2000); await page.screenshot({ path: out + '/s7-punt-anim.png' });
  await page.waitForFunction(() => G.mode === 'result', null, { timeout: 15000 });
  ok(await page.evaluate(() => G.poss === 'away' || /Fumble|touchdown/i.test($('#b1').textContent)), 'punt gives the Comets the ball: ' + await page.textContent('#b1') + ' | ' + await page.textContent('#b2'));
  // computer field goal: student watches
  await page.evaluate(() => { G.mode = 'result'; G.pending = null; G.poss = 'away'; G.ballX = 25; G.down = 4; G.toGo = 9; G.play = 3; setFormation(); showCalls(); });
  const cpu = await page.evaluate(() => G.pending && G.pending.kind);
  ok(cpu === 'fg' && await page.isVisible('[data-kick="watch"]'), 'Comets try a 42-yard field goal on 4th & 9; student gets Watch the kick');
  await page.click('[data-kick="watch"]'); await page.waitForFunction(() => G.mode === 'result', null, { timeout: 15000 });
  ok(true, 'Comets field goal: ' + await page.textContent('#b1'));
  // safety -> free kick from the 20
  await page.evaluate(() => { G.mode = 'result'; G.pending = null; G.poss = 'home'; G.ballX = 2; G.down = 1; G.toGo = 10; setFormation(); showCalls(); });
  await page.click('[data-call="Run Inside"]'); await ans(true);
  await page.evaluate(() => { const real = resolvePlay; window.resolvePlay = (...a) => { const r = real(...a); Object.assign(r, { kind: 'run', yds: -3, safety: true, td: false, fumble: false }); window.resolvePlay = real; return r; }; });
  await page.click('#hNext'); await page.waitForFunction(() => G.mode === 'result', null, { timeout: 15000 });
  ok(await page.evaluate(() => G.pending && G.pending.kind === 'kickoff' && G.pending.kicker === 'home' && G.pending.from === 20), 'safety: Pelicans free kick from their 20');
  await page.click('#nextBtn'); if (await page.isVisible('#break.show')) await page.click('#bkDone');
  ok(await page.evaluate(() => G.ballX === 20), 'free kick spot is the 20');
  // halftime: Pelicans kick off
  await page.evaluate(() => { G.mode = 'result'; G.pending = null; G.lastKind = null; G.play = PLAYS_PER_GAME / 2; G.halftimeDone = false; G.points = 0; afterResult(); });
  if (await page.isVisible('#break.show')) await page.click('#bkDone');
  ok(await page.evaluate(() => G.pending && G.pending.kind === 'kickoff' && G.pending.kicker === 'home'), 'halftime: Pelicans kick off to start the 2nd half');
  // reduced choices and read-aloud work in kick huddles
  await page.goto('file://' + path.resolve('game/index.html') + '?len=Quick&rc=1'); await page.click('#kick'); await page.click('[data-kick="return"]');
  ok((await page.$$('.choice')).length === 3, 'reduced choices in the return huddle');
  ok(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await browser.close(); process.exit(fails ? 1 : 0);
})();
