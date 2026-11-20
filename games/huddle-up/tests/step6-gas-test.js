// Head-to-Head through the real Code.gs functions (CacheService and LockService mocked in Node).
// Run from games/huddle-up:  node tests/step6-gas-test.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path'), vm = require('vm');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const store = new Map();
const cache = { get: k => store.has(k) ? store.get(k) : null, put: (k, v) => store.set(k, String(v)), getAll: ks => { const o = {}; ks.forEach(k => { if (store.has(k)) o[k] = store.get(k); }); return o; } };
const gs = vm.createContext({ CacheService: { getScriptCache: () => cache }, LockService: { getScriptLock: () => ({ waitLock() { }, releaseLock() { } }) }, Math, JSON, String, Number, Date, Error });
vm.runInContext(fs.readFileSync('apps-script/Code.gs', 'utf8'), gs);
const html = fs.readFileSync(path.resolve('game/index.html'));
const server = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(html); }).listen(0);
const FAKE_GAS = () => {
  const mk = (ok, fail) => new Proxy({}, { get: (_, fn) => fn === 'withSuccessHandler' ? h => mk(h, fail) : fn === 'withFailureHandler' ? h => mk(ok, h) : (...a) => window.gasCall(fn, JSON.stringify(a)).then(r => ok && ok(JSON.parse(r)), e => fail && fail(e)) });
  window.google = { script: { run: mk() } };
};
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const pages = [];
  for (let i = 0; i < 2; i++) { // separate contexts = separate computers (no shared browser storage)
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await ctx.exposeFunction('gasCall', (fn, args) => JSON.stringify(gs[fn](...JSON.parse(args))));
    await ctx.addInitScript(FAKE_GAS);
    const p = await ctx.newPage(); p.on('pageerror', e => { console.log('ERR', e.message); fails++; });
    await p.goto(`http://localhost:${server.address().port}/?len=Quick`); pages.push(p);
  }
  const [A, B] = pages;
  ok(await A.evaluate(() => USE_GAS), 'page uses the Apps Script functions');
  await A.click('#h2hBtn'); await A.waitForFunction(() => /^[A-Z]{4}$/.test(document.querySelector('#netBig').textContent));
  const code = await A.textContent('#netBig');
  await B.click('#joinOpen'); await B.fill('#joinCode', code); await B.click('#joinBtn');
  await A.waitForFunction(() => G.net && G.mode === 'call', null, { timeout: 8000 });
  ok(true, 'two separate computers joined through Code.gs with code ' + code);
  const bot = () => setInterval(() => {
    if (G.mode === 'call') { const b = $$('[data-call]'); if (b.length) pick(b).click(); else if ($('#goFor')) $('#puntBtn').click(); }
    else if (G.mode === 'huddle') { if (!G.answered) { G.clockStart = -1e9; answer(Math.random() < .6 ? G.q.choices.findIndex(c => c.right) : 0); } else if ($('#hNext').offsetParent) $('#hNext').click(); }
    else if (G.mode === 'break') closeBreak();
    else if (G.mode === 'result' && $('#nextBtn')) $('#nextBtn').click();
  }, 250);
  await A.evaluate(bot); await B.evaluate(bot);
  await Promise.all([A, B].map(p => p.waitForFunction(() => G.mode === 'final', null, { timeout: 600000, polling: 1000 })));
  const logs = await Promise.all([A, B].map(p => p.evaluate(() => JSON.stringify(G.syncLog))));
  ok(logs[0] === logs[1], `full Quick game matched on both computers (${JSON.parse(logs[0]).length} plays)`);
  ok([...store.keys()].every(k => k.startsWith('h2h_' + code)), `cache keys used: ${store.size}`);
  await browser.close(); server.close(); process.exit(fails ? 1 : 0);
})();
