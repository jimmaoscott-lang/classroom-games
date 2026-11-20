// Forces every result type through planPlay/pose for both teams and checks for errors or bad numbers.
// Run from games/huddle-up:  node tests/plan-test.js [outdir]
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const out = process.argv[2] || '/tmp';
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + path.resolve('game/index.html'));
  await page.click('#kick');
  const bad = await page.evaluate(() => {
    const probs = []; let n = 0;
    const kinds = [
      c => ({ kind: 'run', yds: 4 }), c => ({ kind: 'run', yds: -3 }), c => ({ kind: 'run', yds: 30, td: true }), c => ({ kind: 'run', yds: 3, fumble: true }),
      c => ({ kind: 'complete', air: 7, yds: 12 }), c => ({ kind: 'incomplete', air: 9 }), c => ({ kind: 'sack', yds: -6 }),
      c => ({ kind: 'int', air: 12, ret: 5, spot: 7 }), c => ({ kind: 'int', air: 20, ret: 80, spot: -63, pick6: true }), c => ({ kind: 'complete', air: 25, yds: 40, td: true }),
    ];
    for (const poss of ['home', 'away']) for (const call of OFF_CALLS) for (const dc of DEF_CALLS) for (const k of kinds) {
      const base = k(call); if (call.startsWith('Run') !== (base.kind === 'run')) continue;
      G.poss = poss; G.ballX = poss === 'home' ? 40 : 60; G.defCall = dc; setFormation();
      const res = Object.assign({ call, defCall: dc, T: 0.2 }, base);
      const P = planPlay(res);
      for (let t = 0; t < P.T + 1; t += 0.05) {
        pose(P, t); n++;
        for (const a of G.actors) if (!isFinite(a.x) || !isFinite(a.d)) { probs.push([poss, call, dc, base.kind, 'actor NaN', t]); break; }
        if (!isFinite(G.ball.x) || !isFinite(G.ball.d) || !isFinite(G.ball.h)) probs.push([poss, call, dc, base.kind, 'ball NaN', t]);
      }
      // the carrier should end at the result spot (offense frame) for runs and catches
      if ((base.kind === 'run' || base.kind === 'complete') && !base.td) {
        const c = G.ball.carrier; if (c) { const u = (c.x - G.ballX) * (poss === 'home' ? 1 : -1); if (Math.abs(u - base.yds) > 0.6) probs.push([poss, call, dc, base.kind, 'end spot', u.toFixed(1)]); }
      }
    }
    G.mode = 'title';
    return { probs: probs.slice(0, 20), count: probs.length, n };
  });
  console.log('poses checked:', bad.n, 'problems:', bad.count); bad.probs.forEach(p => console.log(p.join(' | ')));
  // screenshot an interception for the Comets offense and a pick six
  for (const [name, res, poss] of [['int', { kind: 'int', air: 12, ret: 8, spot: 4 }, 'away'], ['fumble', { kind: 'run', yds: 3, fumble: true }, 'home']]) {
    await page.evaluate(([res, poss]) => { G.poss = poss; G.ballX = poss === 'home' ? 40 : 60; G.defCall = 'Zone'; setFormation(); G.res = Object.assign({ call: res.kind === 'run' ? 'Run Inside' : 'Short Pass', defCall: 'Zone', T: .2 }, res); G.plan = planPlay(G.res); G.mode = 'anim'; G.t0 = performance.now(); }, [res, poss]);
    await page.waitForFunction(() => G.mode === 'result', null, { timeout: 15000 });
    await page.screenshot({ path: `${out}/forced-${name}.png` });
    console.log(name, await page.textContent('#b1'), '|', await page.textContent('#b2'), '|', await page.textContent('#dd'));
    await page.click('#nextBtn');
  }
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close(); process.exit(errors.length || bad.count ? 1 : 0);
})();
