// Headless test: plays a full Quick game (offense and defense) with a bot and saves screenshots.
// Run from games/huddle-up:  node tests/play-test.js [outdir] [games]
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const out = process.argv[2] || '/tmp';
const GAMES = +(process.argv[3] || 1);
const MISS = +(process.argv[4] || 0.3);
const shots = {}; let breaks = 0;
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_|Failed to load/.test(m.text())) errors.push(m.text()); });
  await page.goto('file://' + path.resolve('game/index.html') + '?len=Quick');
  await page.waitForTimeout(400);
  await page.screenshot({ path: out + '/1-title.png' });
  const seenAnim = new Set(), seenKind = new Set();
  for (let g = 0; g < GAMES; g++) {
    await page.click(g === 0 ? '#kick' : '#again'); await page.waitForTimeout(300);
    let n = 0;
    for (let guard = 0; guard < 600; guard++) {
      if (await page.isVisible('#final.show')) break;
      const st = await page.evaluate(() => ({ mode: G.mode, off: G.poss === 'home', down: G.down, play: G.play }));
      if (st.mode === 'call') {
        if (await page.isVisible('[data-kick]')) { await page.click('[data-kick]'); continue; }
        if (await page.isVisible('#goFor')) { const fg = await page.isEnabled('#fgBtn'); const r = Math.random(); await page.click(fg && r < .4 ? '#fgBtn' : r < .7 ? '#goFor' : '#puntBtn'); continue; }
        const btns = await page.$$('[data-call]');
        if (!btns.length) { await page.waitForTimeout(100); continue; }
        await btns[Math.floor(Math.random() * btns.length)].click(); continue;
      }
      if (await page.isVisible('#lock.on')) { if (!shots.lock) { shots.lock = 1; await page.screenshot({ path: out + '/lock.png' }); } await page.waitForFunction(() => !document.querySelector('#lock.on'), null, { timeout: 20000 }); continue; }
      if (st.mode === 'break') {
        breaks++;
        if (!shots.brk) { shots.brk = 1; await page.screenshot({ path: out + '/break-1.png' }); }
        for (let k = 0; k < 6 && await page.evaluate(() => G.points > 0); k++) { await page.click(`.pcard:nth-child(${1 + Math.floor(Math.random() * 7)})`); if (await page.isEnabled('#plusBtn')) await page.click('#plusBtn'); }
        if (!shots.brk2) { shots.brk2 = 1; await page.screenshot({ path: out + '/break-2.png' }); }
        await page.click('#bkDone'); continue;
      }
      if (st.mode === 'huddle') {
        if (!await page.evaluate(() => G.answered)) {
          const miss = Math.random() < MISS;
          const idx = await page.evaluate(m => G.q.choices.findIndex(c => m ? !c.right : c.right), miss);
          if (g === 0 && n === 0) await page.screenshot({ path: out + '/2-huddle.png' });
          await page.click(`.choice[data-i="${idx}"]`);
        }
        await page.click('#hNext'); continue;
      }
      if (st.mode === 'anim') {
        const key = await page.evaluate(() => G.plan && G.plan.kick ? 'K-' + G.res.kind + '-' + (G.res.out || (G.res.good ? 'good' : 'miss')) : (G.poss === 'home' ? 'O-' : 'D-') + G.offCall);
        if (!seenAnim.has(key)) { seenAnim.add(key); await page.waitForTimeout(key.startsWith('K-') ? 2400 : key.includes('Deep') || key.includes('Action') ? 2200 : 1300); await page.screenshot({ path: `${out}/anim-${key.replace(/ /g, '')}.png` }); }
        await page.waitForFunction(() => G.mode !== 'anim', null, { timeout: 20000 });
        continue;
      }
      if (st.mode === 'result') {
        n++;
        const info = await page.evaluate(() => ({ b1: document.querySelector('#b1').textContent, b2: document.querySelector('#b2').textContent, dd: document.querySelector('#dd').textContent, sub: document.querySelector('#sub').textContent, kind: G.res && G.res.kind, score: G.score.home + '-' + G.score.away }));
        const k = info.b1.split(/[ !·]/)[0];
        if (!shots.hurt && await page.isVisible('#trainer.show')) { shots.hurt = 1; await page.screenshot({ path: out + '/trainer.png' }); }
        if (!seenKind.has(k)) { seenKind.add(k); await page.screenshot({ path: `${out}/res-${k.replace(/\W/g, '')}.png` }); }
        if (g === 0) console.log(String(n).padStart(2), info.score, '|', info.b1, '|', info.b2, '|', info.dd, '|', info.sub);
        await page.click('#nextBtn'); await page.waitForTimeout(80); continue;
      }
      await page.waitForTimeout(100);
    }
    const fin = await page.evaluate(() => { const avg = t => Math.round(POS.reduce((n, p) => n + G.ratings[t][p].now, 0) / 8); return [document.querySelector('#fWin').textContent, G.score.home + '-' + G.score.away, 'plays', G.play, 'rating avg PEL', avg('home'), 'COM', avg('away'), 'spent', G.spent, 'injuries', G.injuries, 'flags', G.log.filter(e => e.guess).length, 'log', G.log.length].join(' '); });
    console.log(`game ${g + 1} final:`, fin);
    if (g === 0) await page.screenshot({ path: out + '/9-final.png' });
  }
  console.log('breaks shown:', breaks);
  console.log('animated:', [...seenAnim].join(', '));
  await page.goto('file://' + path.resolve('game/index.html') + '?rc=1&len=Quick');
  await page.click('#kick'); await page.evaluate(() => { G.pending = null; changePoss('home', 25); setFormation(); showCalls(); }); /* skip the opening kickoff */ await page.click('[data-call="Run Inside"]');
  console.log('choices with reduced:', await page.$$eval('.choice', b => b.length));
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
