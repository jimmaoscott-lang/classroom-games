// Headless test of the field prototype: plays all 12 plays with a bot and saves screenshots.
// Run from games/huddle-up:  node tests/play-test.js [outdir]
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const out = process.argv[2] || '/tmp';
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_|Failed to load/.test(m.text())) errors.push(m.text()); });
  await page.goto('file://' + path.resolve('game/index.html') + '?rc=0');
  await page.waitForTimeout(500);
  await page.screenshot({ path: out + '/1-title.png' });
  await page.click('#kick'); await page.waitForTimeout(600);
  await page.screenshot({ path: out + '/2-field.png' });
  let shots = 0, plays = 0, wrongs = 0;
  for (let guard = 0; guard < 200; guard++) {
    if (await page.isVisible('#final.show')) break;
    const mode = await page.evaluate(() => G.mode);
    if (mode === 'call') { await page.click('[data-call="Run Inside"]'); continue; }
    if (mode === 'huddle') {
      if (shots === 0) { await page.screenshot({ path: out + '/3-huddle.png' }); }
      const answered = await page.evaluate(() => G.answered);
      if (!answered) {
        // miss the first question on plays 3 and 6 (twice on play 6 for a delay of game)
        const p = await page.evaluate(() => G.play);
        const miss = (p === 2 || (p === 5)) && !(p === 2 && await page.evaluate(() => G.attempt === 2));
        const idx = await page.evaluate(m => G.q.choices.findIndex(c => m ? !c.right : c.right), miss);
        if (miss) wrongs++;
        await page.click(`.choice[data-i="${idx}"]`);
        if (shots === 0) { await page.waitForTimeout(200); await page.screenshot({ path: out + '/4-answered.png' }); shots++; }
      }
      await page.click('#hNext'); continue;
    }
    if (mode === 'anim') {
      if (plays === 0) { await page.waitForTimeout(1100); await page.screenshot({ path: out + '/5-anim.png' }); }
      await page.waitForFunction(() => G.mode !== 'anim', null, { timeout: 15000 });
      continue;
    }
    if (mode === 'result') {
      plays++;
      if (plays <= 3 || await page.evaluate(() => /Touchdown|Flag/i.test(document.querySelector('#b1').textContent))) await page.screenshot({ path: `${out}/6-result-${plays}.png` });
      const s = await page.evaluate(() => [document.querySelector('#b1').textContent, document.querySelector('#b2').textContent, document.querySelector('#dd').textContent, G.points].join(' | '));
      console.log('play', plays, s);
      await page.click('#nextBtn'); await page.waitForTimeout(150); continue;
    }
    await page.waitForTimeout(100);
  }
  await page.screenshot({ path: out + '/7-final.png' });
  console.log('final:', await page.textContent('#fStats'));
  // reduced choices check
  await page.goto('file://' + path.resolve('game/index.html') + '?rc=1');
  await page.click('#kick'); await page.click('[data-call="Run Inside"]');
  console.log('choices with reduced:', await page.$$eval('.choice', b => b.length));
  await page.click('.exit >> nth=1').catch(()=>{});
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
