// Headless test: plays a full Quick game (offense and defense) with a bot and saves screenshots.
// Run from games/huddle-up:  node tests/play-test.js [outdir] [games]
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const out = process.argv[2] || '/tmp';
const GAMES = +(process.argv[3] || 1);
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_|Failed to load/.test(m.text())) errors.push(m.text()); });
  await page.goto('file://' + path.resolve('game/index.html'));
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
        if (await page.isVisible('#goFor')) { await page.click(Math.random() < .5 ? '#goFor' : '#puntBtn'); continue; }
        const btns = await page.$$('[data-call]');
        if (!btns.length) { await page.waitForTimeout(100); continue; }
        await btns[Math.floor(Math.random() * btns.length)].click(); continue;
      }
      if (st.mode === 'huddle') {
        if (!await page.evaluate(() => G.answered)) {
          const miss = Math.random() < 0.3;
          const idx = await page.evaluate(m => G.q.choices.findIndex(c => m ? !c.right : c.right), miss);
          if (g === 0 && n === 0) await page.screenshot({ path: out + '/2-huddle.png' });
          await page.click(`.choice[data-i="${idx}"]`);
        }
        await page.click('#hNext'); continue;
      }
      if (st.mode === 'anim') {
        const key = await page.evaluate(() => (G.poss === 'home' ? 'O-' : 'D-') + G.offCall);
        if (!seenAnim.has(key)) { seenAnim.add(key); await page.waitForTimeout(key.includes('Deep') || key.includes('Action') ? 2200 : 1300); await page.screenshot({ path: `${out}/anim-${key.replace(/ /g, '')}.png` }); }
        await page.waitForFunction(() => G.mode !== 'anim', null, { timeout: 20000 });
        continue;
      }
      if (st.mode === 'result') {
        n++;
        const info = await page.evaluate(() => ({ b1: document.querySelector('#b1').textContent, b2: document.querySelector('#b2').textContent, dd: document.querySelector('#dd').textContent, sub: document.querySelector('#sub').textContent, kind: G.res && G.res.kind, score: G.score.home + '-' + G.score.away }));
        const k = info.b1.split(/[ !·]/)[0];
        if (!seenKind.has(k)) { seenKind.add(k); await page.screenshot({ path: `${out}/res-${k.replace(/\W/g, '')}.png` }); }
        if (g === 0) console.log(String(n).padStart(2), info.score, '|', info.b1, '|', info.b2, '|', info.dd, '|', info.sub);
        await page.click('#nextBtn'); await page.waitForTimeout(80); continue;
      }
      await page.waitForTimeout(100);
    }
    const fin = await page.evaluate(() => [document.querySelector('#fWin').textContent, G.score.home + '-' + G.score.away, G.play].join(' '));
    console.log(`game ${g + 1} final:`, fin);
    if (g === 0) await page.screenshot({ path: out + '/9-final.png' });
  }
  console.log('animated:', [...seenAnim].join(', '));
  await page.goto('file://' + path.resolve('game/index.html') + '?rc=1');
  await page.click('#kick'); await page.click('[data-call="Run Inside"]');
  console.log('choices with reduced:', await page.$$eval('.choice', b => b.length));
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
