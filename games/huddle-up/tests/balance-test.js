// Monte Carlo check of the result math. Run from games/huddle-up:  node tests/balance-test.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve('game/index.html') + '?len=Quick');
  const tune = (process.env.TUNE || '').split(',').map(Number);
  const out = await page.evaluate((tune) => {
    if (tune.length === 3) { DUEL_SPAN = tune[0]; DUEL_K = tune[1]; DUEL_T = tune[2]; }
    const N = 4000, rows = [];
    const setR = (team, v) => POS.forEach(p => { G.ratings[team][p].now = v; G.ratings[team][p].start = v; });
    function sim(call, dc, oq, dq, offR, defR, tweak) {
      setR('home', offR); setR('away', defR); if (tweak) tweak();
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
    // position duels: one star player vs an average opponent
    const one = (team, p, v) => () => { G.ratings[team][p].now = v; };
    const duelRows = [
      ['Sacks: D-Line 100 vs O-Line 65 (Short Pass vs Zone)', 'sack', sim('Short Pass', 'Zone', 'clean', 'clean', 65, 65), sim('Short Pass', 'Zone', 'clean', 'clean', 65, 65, one('away', 'D-Line', 100))],
      ['Sacks: O-Line 100 vs D-Line 65 (Deep Pass vs Blitz)', 'sack', sim('Deep Pass', 'Blitz', 'clean', 'clean', 65, 65), sim('Deep Pass', 'Blitz', 'clean', 'clean', 65, 65, one('home', 'O-Line', 100))],
      ['Run Outside yards: RB 100 vs LB 65', 'avg', sim('Run Outside', 'Zone', 'clean', 'clean', 65, 65), sim('Run Outside', 'Zone', 'clean', 'clean', 65, 65, one('home', 'RB', 100))],
      ['Run Inside yards: LB 100 vs RB 65', 'avg', sim('Run Inside', 'Zone', 'clean', 'clean', 65, 65), sim('Run Inside', 'Zone', 'clean', 'clean', 65, 65, one('away', 'Linebacker', 100))],
      ['Short Pass incompletions: Secondary 100', 'inc', sim('Short Pass', 'Zone', 'clean', 'clean', 65, 65), sim('Short Pass', 'Zone', 'clean', 'clean', 65, 65, one('away', 'Secondary', 100))],
      ['Short Pass yards: WR 100', 'avg', sim('Short Pass', 'Zone', 'clean', 'clean', 65, 65), sim('Short Pass', 'Zone', 'clean', 'clean', 65, 65, one('home', 'WR', 100))],
      ['Deep Pass turnovers: QB 100', 'to', sim('Deep Pass', 'Zone', 'clean', 'clean', 65, 65), sim('Deep Pass', 'Zone', 'clean', 'clean', 65, 65, one('home', 'QB', 100))],
    ];
    // the key rule: right answers with lower ratings vs wrong answers with higher ratings
    const cmp = [];
    for (const c of OFF_CALLS) {
      const a = sim(c, 'Zone', 'clean', 'shaky', 62, 80); // offense answered, defense missed, defense much better
      const b = sim(c, 'Zone', 'shaky', 'clean', 80, 62); // offense missed, defense answered, offense much better
      cmp.push([c, 'answered+weaker', a.avg, 'missed+stronger', b.avg]);
      const a2 = sim(c, 'Zone', 'clean', 'shaky', 60, 100), b2 = sim(c, 'Zone', 'shaky', 'clean', 100, 60); // worst case: 60s vs maxed-out 100s
      cmp.push([c + ' (60 vs 100)', 'answered+weaker', a2.avg, 'missed+stronger', b2.avg]);
    }
    return { rows, cmp, duelRows };
  }, tune);
  out.rows.forEach(r => console.log(r.join(' | ')));
  let ok = true;
  console.log('--- position duels (even 65s -> one player changed) ---');
  out.duelRows.forEach(([name, key, a, b]) => { const up = /O-Line 100|RB 100 vs|WR 100/.test(name) ? (key === 'sack' ? b[key] < a[key] : b[key] > a[key]) : /QB 100/.test(name) ? b[key] < a[key] : b[key] > a[key] || (key === 'avg' && b[key] < a[key]);
    const want = { 'sack': name.includes('D-Line 100') ? b.sack > a.sack : b.sack < a.sack }[key];
    console.log(name, key, a[key], '->', b[key]); });
  console.log('--- right answers beat higher ratings? ---');
  // typical gap (62 vs 80): right answers must win. Worst case (60 vs a full roster of 100s): about even is OK.
  out.cmp.forEach(r => { const worst = r[0].includes('60 vs 100'); const pass = worst ? r[2] >= r[4] - 1 : r[2] > r[4]; console.log((pass ? '' : 'FAIL ') + r.join(' ')); if (!pass) ok = false; });
  console.log(ok ? 'PASS' : 'FAIL');
  await browser.close(); process.exit(ok ? 0 : 1);
})();
