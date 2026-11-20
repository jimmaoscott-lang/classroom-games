// Headless checks for build step 6: Head-to-Head on two computers (two windows, local storage backend).
// Run from games/huddle-up:  node tests/step6-test.js [outdir] [games]
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const out = process.argv[2] || '/tmp', GAMES = +(process.argv[3] || 2);
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const html = fs.readFileSync(path.resolve('game/index.html'));
const server = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(html); }).listen(0);
// Bot that plays inside a page: random calls, 70% right answers, spends points, presses every Next.
const BOT = () => {
  window.botStep = () => {
    const vis = s => { const e = document.querySelector(s); return e && e.offsetParent !== null; };
    if (!G || G.mode === 'final' || G.mode === 'left') return;
    if (document.querySelector('#lock.on')) return;
    if (G.mode === 'call') {
      if (vis('[data-kick]')) return $('[data-kick]').click();
      if (vis('#goFor')) { const r = Math.random(); return (!$('#fgBtn').disabled && r < .4 ? $('#fgBtn') : r < .7 ? $('#goFor') : $('#puntBtn')).click(); }
      const b = $$('[data-call]'); if (b.length) pick(b).click(); return;
    }
    if (G.mode === 'huddle') {
      if (!G.answered) { G.clockStart = -1e9; const i = Math.random() < 0.7 ? G.q.choices.findIndex(c => c.right) : G.q.choices.findIndex(c => !c.right); answer(i); }
      else if (vis('#hNext')) $('#hNext').click();
      return;
    }
    if (G.mode === 'break') { if (G.points > 0) { G.sel = pick(POS); renderBreak(); spendPoint(); } else closeBreak(); return; }
    if (G.mode === 'result' && vis('#nextBtn')) $('#nextBtn').click();
  };
  window.botTimer = setInterval(window.botStep, 250);
};
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const url = `http://localhost:${server.address().port}/index.html?len=Quick`;
  const A = await ctx.newPage(), B = await ctx.newPage();
  const errors = []; [A, B].forEach(p => p.on('pageerror', e => errors.push(e.message)));
  await A.goto(url); await B.goto(url);
  ok(await A.isVisible('#h2hBtn') && await A.isVisible('#joinOpen'), 'title screen has Head-to-Head and Join a Game');
  // join errors
  await B.click('#joinOpen'); await B.fill('#joinCode', 'ZZZZ'); await B.click('#joinBtn'); await B.waitForTimeout(400);
  ok(/No game/.test(await B.textContent('#netErr')), 'wrong code is refused: ' + await B.textContent('#netErr'));
  await B.fill('#joinCode', 'AB'); await B.click('#joinBtn');
  ok(/4 letters/.test(await B.textContent('#netErr')), 'short code is refused');
  for (let g = 1; g <= GAMES; g++) {
    if (g > 1) { for (const p of [A, B]) { await p.evaluate(() => clearInterval(window.botTimer)); await p.click('#final .exit'); } await B.click('#joinOpen'); }
    await A.click('#h2hBtn'); await A.waitForFunction(() => /^[A-Z]{4}$/.test(document.querySelector('#netBig').textContent));
    const code = await A.textContent('#netBig');
    if (g === 1) await A.screenshot({ path: out + '/s6-code.png' });
    ok(await A.evaluate(() => G.mode === 'lobby'), `game ${g}: host waits in the lobby with code ${code}`);
    await B.fill('#joinCode', code.toLowerCase()); await B.click('#joinBtn');
    await B.waitForFunction(() => G.net && G.me === 'away');
    await A.waitForFunction(() => G.net && G.me === 'home', null, { timeout: 8000 });
    ok(true, `game ${g}: guest joined (lowercase typed) and both games started`);
    if (g === 1) {
      // a third coach cannot join a full game
      const C = await ctx.newPage(); await C.goto(url); await C.click('#joinOpen'); await C.fill('#joinCode', code); await C.click('#joinBtn'); await C.waitForTimeout(400);
      ok(/two coaches/.test(await C.textContent('#netErr')), 'third coach is refused'); await C.close();
      ok(await A.evaluate(() => JSON.stringify(G.ratings)) === await B.evaluate(() => JSON.stringify(G.ratings)), 'both computers start with the same ratings');
      // opening kickoff: guest (Comets) kicks, host (Pelicans) returns; both answer, both see the same kick
      ok(await A.isVisible('[data-kick="return"]') && await B.isVisible('[data-kick="kickoff"]'), 'opening kickoff: Comets coach kicks, Pelicans coach returns');
      for (const p of [A, B]) { await p.click('[data-kick]'); const i = await p.evaluate(() => G.q.choices.findIndex(c => c.right)); await p.evaluate(() => G.clockStart = -1e9); await p.click(`.choice[data-i="${i}"]`); await p.click('#hNext'); }
      await Promise.all([A, B].map(p => p.waitForFunction(() => G.mode === 'result', null, { timeout: 15000 })));
      const ko = await Promise.all([A, B].map(p => p.evaluate(() => JSON.stringify([G.res, G.poss, G.ballX]))));
      ok(ko[0] === ko[1], 'same kickoff result on both screens: ' + await A.textContent('#b1'));
      await A.screenshot({ path: out + '/s6-kickoff-result.png' });
      for (const p of [A, B]) { await p.click('#nextBtn'); if (await p.isVisible('#break.show')) await p.click('#bkDone'); }
      // put the Pelicans on offense for the secret-call checks (same change on both computers)
      for (const p of [A, B]) await p.evaluate(() => { changePoss('home', 25); setFormation(); showCalls(); });
      ok(/Coach Pelicans · Offense/.test(await A.textContent('#label')) && /Coach Comets · Defense/.test(await B.textContent('#label')), 'host coaches Pelicans offense, guest coaches Comets defense');
      // secret calls: host calls and waits; guest has not been told the call
      await A.click('[data-call="Short Pass"]');
      const idx = await A.evaluate(() => G.q.choices.findIndex(c => c.right)); await A.evaluate(() => G.clockStart = -1e9);
      await A.click(`.choice[data-i="${idx}"]`); await A.click('#hNext');
      await A.waitForTimeout(1500);
      ok(await A.evaluate(() => G.mode === 'wait'), 'host waits for the guest after pressing Ready');
      await A.screenshot({ path: out + '/s6-waiting.png' });
      ok(await B.evaluate(() => G.offCall == null && G.mode === 'call'), 'guest does not see the host play call');
      await B.click('[data-call="Man Coverage"]'); await B.screenshot({ path: out + '/s6-guest-huddle.png' });
      const j = await B.evaluate(() => G.q.choices.findIndex(c => c.right)); await B.evaluate(() => G.clockStart = -1e9);
      await B.click(`.choice[data-i="${j}"]`); await B.click('#hNext');
      await Promise.all([A, B].map(p => p.waitForFunction(() => G.mode === 'anim', null, { timeout: 8000 })));
      ok(await A.evaluate(() => G.defCall) === 'Man Coverage' && await B.evaluate(() => G.offCall) === 'Short Pass', 'both screens snap with both calls');
      await A.waitForTimeout(1200); await A.screenshot({ path: out + '/s6-host-anim.png' }); await B.screenshot({ path: out + '/s6-guest-anim.png' });
      const same = await Promise.all([A, B].map(p => p.evaluate(() => JSON.stringify([G.res, G.plan.T]))));
      ok(same[0] === same[1], 'same play result and animation on both screens');
      await Promise.all([A, B].map(p => p.waitForFunction(() => G.mode === 'result', null, { timeout: 15000 })));
      await A.screenshot({ path: out + '/s6-host-result.png' }); await B.screenshot({ path: out + '/s6-guest-result.png' });
    }
    await A.evaluate(BOT); await B.evaluate(BOT);
    await Promise.all([A, B].map(p => p.waitForFunction(() => G.mode === 'final', null, { timeout: 600000, polling: 1000 })));
    const [la, lb] = await Promise.all([A, B].map(p => p.evaluate(() => ({ log: G.syncLog, score: G.score, play: G.play, win: $('#fWin').textContent }))));
    ok(JSON.stringify(la.log) === JSON.stringify(lb.log) && la.log.length >= 24, `game ${g}: both screens matched on all ${la.log.length} plays · final ${la.score.home}-${la.score.away}`);
    console.log('   host sees "' + la.win + '", guest sees "' + lb.win + '"');
    if (g === 1) { await A.screenshot({ path: out + '/s6-final-host.png' }); await B.screenshot({ path: out + '/s6-final-guest.png' }); }
  }
  // leaving: guest exits mid-game, host is told
  for (const p of [A, B]) { await p.evaluate(() => clearInterval(window.botTimer)); await p.click('#final .exit'); }
  await A.click('#h2hBtn'); await A.waitForFunction(() => /^[A-Z]{4}$/.test(document.querySelector('#netBig').textContent));
  await B.click('#joinOpen'); await B.fill('#joinCode', await A.textContent('#netBig')); await B.click('#joinBtn');
  await A.waitForFunction(() => G.net && G.mode === 'call', null, { timeout: 8000 });
  await B.click('#panel .exit');
  await A.waitForFunction(() => G.mode === 'left', null, { timeout: 12000 });
  ok(/left the game/.test(await A.textContent('#netMsg')), 'host is told when the other coach leaves');
  await A.screenshot({ path: out + '/s6-left.png' });
  // solo still works
  await A.click('#net [data-exit]'); await A.click('#kick');
  ok(await A.evaluate(() => !G.net && G.me === 'home' && G.mode === 'call'), 'solo game still starts');
  ok(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await browser.close(); server.close(); process.exit(fails ? 1 : 0);
})();
