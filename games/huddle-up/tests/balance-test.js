// Monte Carlo check of the result math. Run from games/huddle-up:  node tests/balance-test.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve('game/index.html') + '?len=Quick');
  const out = await page.evaluate(() => {
    const N = 4000, rows = [];
    const setR = (team, v) => POS.forEach(p => { G.ratings[team][p].now = v; G.ratings[team][p].start = v; });
    function sim(call, dc, oq, dq, offR, defR) {
      setR('home', offR); setR('away', defR);
      let y = 0, td = 0, to = 0, inc = 0, sack = 0;
      for (let i = 0; i < N; i++) {
        G.poss = 'home'; G.ballX = 30; G.toGo = 10;
        const r = resolvePlay(call, dc, oq, dq, {});
        if (r.kind === 'int' || r.fumble) to++; else if (r.kind === 'incomplete') inc++; else y += r.yds;
        if (r.kind === 'sack') sack++; if (r.td) td++;
      }
      return { avg: +(y / N).toFixed(1), td: +(100 * td / N).toFixed(1), to: +(100 * to / N).toFixed(1), inc: +(100 * inc / N).toFixed(0), sack: +(100 * sack / N).toFixed(1) };
    }
    for (const c of OFF_CALLS) for (const d of DEF_CALLS) {
      rows.push([c, d, 'even', JSON.stringify(sim(c, d, 'clean', 'clean', 65, 65))]);
    }
    // the key rule: right answers with lower ratings vs wrong answers with higher ratings
    const cmp = [];
    for (const c of OFF_CALLS) {
      const a = sim(c, 'Zone', 'clean', 'shaky', 62, 80); // offense answered, defense missed, defense much better
      const b = sim(c, 'Zone', 'shaky', 'clean', 80, 62); // offense missed, defense answered, offense much better
      cmp.push([c, 'answered+weaker', a.avg, 'missed+stronger', b.avg]);
    }
    return { rows, cmp };
  });
  out.rows.forEach(r => console.log(r.join(' | ')));
  console.log('--- right answers beat higher ratings? ---');
  let ok = true;
  out.cmp.forEach(r => { console.log(r.join(' ')); if (!(r[2] > r[4])) ok = false; });
  console.log(ok ? 'PASS' : 'FAIL');
  await browser.close(); process.exit(ok ? 0 : 1);
})();
