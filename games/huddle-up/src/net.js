
// ---------- Head-to-Head (build step 6) ----------
// Two computers play one game. The coach who clicks Head-to-Head is the Pelicans (home) and gets a
// 4-letter code; the coach who joins is the Comets (away).
// Lockstep: each computer runs its own huddle, then sends a "ready" message with its play call, huddle
// result, on-field penalty effects and its team's ratings. When both ready messages for a play are in,
// both computers run the same result math with the same random seed, so both screens show the same play.
// Messages go through Apps Script's CacheService (Code.gs h2h* functions). Opened outside Apps Script
// (a downloaded file or a test page), the game uses this browser's storage instead, so two windows of the
// same browser can play each other. Add ?net=local to force that.
const NET_FAST = 1200, NET_SLOW = 5000; // poll every 1.2 s while waiting on the other coach, else every 5 s
const CODE_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I or O (easy to mix up with 1 and 0)
const USE_GAS = typeof google !== 'undefined' && google.script && google.script.run && QS.get('net') !== 'local';

// Same random numbers on both computers: mulberry32 seeded from the game seed + play number.
function seededRandom(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
  let a = h >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
// Runs fn with Math.random replaced by the shared seeded generator (only in Head-to-Head).
function withSeed(tag, fn) {
  if (!G || !G.net) return fn();
  const real = Math.random; Math.random = seededRandom(G.net.seed + ':' + tag);
  try { return fn(); } finally { Math.random = real; }
}

// Local stand-in for the Code.gs functions (same names, same answers), stored in localStorage.
const LOCAL_NET = {
  get(k) { try { return localStorage.getItem('hu_' + k); } catch (e) { return null; } },
  put(k, v) { try { localStorage.setItem('hu_' + k, v); } catch (e) { } },
  h2hCreate(settings) {
    try { // clear games older than 6 hours
      const old = Date.now() - 6 * 3600e3, kill = [];
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^hu_[A-Z]{4}$/.test(k)) { const m = JSON.parse(localStorage.getItem(k) || '{}'); if (!(m.t > old)) kill.push(k.slice(3)); } }
      for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (kill.some(c => k.startsWith('hu_' + c))) localStorage.removeItem(k); }
    } catch (e) { }
    let code; do { code = Array.from({ length: 4 }, () => CODE_ABC[Math.floor(Math.random() * CODE_ABC.length)]).join(''); } while (this.get(code));
    const seed = String(Math.floor(Math.random() * 1e9));
    this.put(code, JSON.stringify({ settings, seed, t: Date.now() }));
    return { code, seed };
  },
  h2hJoin(code) {
    code = String(code || '').toUpperCase().trim();
    const m = this.get(code); if (!m) return { ok: false, msg: 'No game with that code. Check the code with the other coach.' };
    if (this.get(code + '_guest')) return { ok: false, msg: 'That game already has two coaches.' };
    this.put(code + '_guest', '1');
    const meta = JSON.parse(m); return { ok: true, code, seed: meta.seed, settings: meta.settings };
  },
  h2hSend(code, side, n, json) { this.put(`${code}_${side}_${n}`, json); return true; },
  h2hPoll(code, side, since) {
    const opp = side === 'home' ? 'away' : 'home', msgs = [];
    for (let n = since; n < since + 30; n++) { const m = this.get(`${code}_${opp}_${n}`); if (m == null) break; msgs.push(m); }
    return { guest: !!this.get(code + '_guest'), msgs };
  },
};
function netCall(fn, ...args) {
  if (!USE_GAS) return new Promise(res => setTimeout(() => res(LOCAL_NET[fn](...args)), 120));
  return new Promise((res, rej) => google.script.run.withSuccessHandler(res).withFailureHandler(rej)[fn](...args));
}

// The connection for one game: { code, seed, side, sent, got, inbox, timer }
let NET = null;
function netStart(code, seed, side) {
  netStop();
  NET = { code, seed, side, sent: 0, got: 0, inbox: {}, busy: false, last: 0, outbox: [], guest: side === 'away', bye: false };
  NET.timer = setInterval(netTick, 300);
  return NET;
}
function netStop() { if (NET && NET.timer) clearInterval(NET.timer); NET = null; }
const netWaiting = () => G && ['wait', 'wait4', 'lobby'].includes(G.mode);
function netTick() {
  if (!NET || NET.busy) return;
  if (NET.outbox.length) return netFlush();
  if (performance.now() - NET.last < (netWaiting() ? NET_FAST : NET_SLOW)) return;
  NET.busy = true; NET.last = performance.now();
  const n = NET;
  netCall('h2hPoll', n.code, n.side, n.got).then(r => {
    n.busy = false; if (NET !== n) return;
    n.guest = n.guest || r.guest;
    (r.msgs || []).forEach(j => { n.got++; try { const m = JSON.parse(j); n.inbox[m.t + ':' + (m.k == null ? '' : m.k)] = m; } catch (e) { } });
    netCheck();
  }, () => { n.busy = false; });
}
// Messages are sent in order, one at a time; a failed send is retried on the next tick.
function netSend(msg) { if (!NET) return; NET.outbox.push(msg); netTick(); }
function netFlush() {
  const n = NET, msg = n.outbox[0]; n.busy = true;
  netCall('h2hSend', n.code, n.side, n.sent, JSON.stringify(msg)).then(() => {
    n.busy = false; if (NET !== n) return; n.outbox.shift(); n.sent++;
  }, () => { n.busy = false; });
}
function netLeave() { if (NET && G && G.net && G.mode !== 'final') { const n = NET; netCall('h2hSend', n.code, n.side, n.sent + n.outbox.length, JSON.stringify({ t: 'bye' })).catch(() => { }); } netStop(); }
addEventListener('beforeunload', netLeave);

// Called after every poll: does the game have what it is waiting for?
function netCheck() {
  if (!NET || !G) return;
  if (NET.inbox['bye:'] && G.mode !== 'final' && G.mode !== 'left') return otherCoachLeft();
  if (G.mode === 'lobby' && NET.guest) return startNetGame();
  if (G.mode === 'wait' && NET.inbox['ready:' + G.seq]) return resolveReady();
  if (G.mode === 'wait4' && NET.inbox['fourth:' + G.seq]) return resolveFourth();
}

// ---------- lobby screens ----------
function netScreen(title, big, msg, opts) {
  opts = opts || {};
  $('#title').classList.remove('show');
  $('#netTitle').textContent = title; $('#netBig').textContent = big || ''; $('#netBig').style.display = big ? '' : 'none';
  $('#netMsg').textContent = msg || ''; $('#netErr').textContent = '';
  $('#netJoin').style.display = opts.join ? 'flex' : 'none';
  $('#netWait').style.display = opts.wait ? '' : 'none';
  $('#netBack').style.display = opts.back ? '' : 'none';
  $('#net').classList.add('show');
  if (opts.join) setTimeout(() => $('#joinCode').focus(), 50);
}
function hostGame() {
  netScreen('Head-to-Head', '····', 'Making a game code...', { wait: true });
  G.mode = 'lobby';
  netCall('h2hCreate', { length: LENGTH, rpp: RATING_PER_POINT }).then(r => {
    if (G.mode !== 'lobby') return;
    netStart(r.code, r.seed, 'home');
    $('#netBig').textContent = r.code;
    $('#netMsg').textContent = 'You coach the Pelicans. Tell the other coach to click Join a Game and type this code.';
    if (G.accom.readAloud) speak('Your game code is ' + r.code.split('').join(' ') + '. ' + $('#netMsg').textContent);
  }, () => netScreen('Head-to-Head', '', 'Could not make a game code. Check the internet connection and try again.', { back: true }));
}
function joinScreen() { G.mode = 'join'; netScreen('Join a Game', '', 'Type the 4-letter code from the other coach.', { join: true }); $('#joinCode').value = ''; }
function joinGame() {
  const code = $('#joinCode').value.toUpperCase().replace(/[^A-Z]/g, '');
  if (code.length !== 4) { $('#netErr').textContent = 'The code has 4 letters.'; return; }
  $('#joinBtn').disabled = true; $('#netErr').textContent = 'Joining...';
  netCall('h2hJoin', code).then(r => {
    $('#joinBtn').disabled = false;
    if (!r || !r.ok) { $('#netErr').textContent = (r && r.msg) || 'Could not join that game.'; return; }
    applySettings(r.settings && r.settings.length, DIFF);
    netStart(code, r.seed, 'away');
    startNetGame();
  }, () => { $('#joinBtn').disabled = false; $('#netErr').textContent = 'Could not reach the game. Check the internet connection and try again.'; });
}
function startNetGame() {
  $('#net').classList.remove('show'); stopSpeech();
  newGame({ me: NET.side, net: { code: NET.code, seed: NET.seed } });
  banner('Head-to-Head', `${meN()} vs ${opN()} · ${TEAMS.away.short} kick off to the ${TEAMS.home.short}`, '');
}
function otherCoachLeft() {
  G.mode = 'left'; closeHuddle(); $('#break').classList.remove('show'); netStop();
  netScreen('Head-to-Head', '', `The ${opN()} coach left the game. Press Exit / Start Over to play again.`);
}

// ---------- play-by-play syncing ----------
// After the huddle: send this coach's half of the play, then wait for the other coach.
function sendReady() {
  closeHuddle();
  const off = userOnOffense();
  netSend({ t: 'ready', k: G.seq, call: G.pending ? G.hSide : off ? G.offCall : G.defCall, q: G.userQ, mods: G.mods, ratings: G.ratings[G.me], notes: G.myNotes || [] });
  // Field goals and extra points: only the kicking team has a huddle, so the kicker does not wait.
  if (G.pending && (G.pending.kind === 'fg' || G.pending.kind === 'pat')) return kickGo();
  waitFor('wait', `Waiting for the ${opN()} coach to finish the huddle...`);
  netCheck();
}
function waitFor(mode, text) {
  G.mode = mode; G.waitStart = performance.now();
  $('#label').textContent = `Coach ${meN()} · ${mode === 'wait4' ? '4th down' : 'Ready'}`;
  $('#calls').innerHTML = `<div class="waitbox"><span class="dots"><i></i><i></i><i></i></span><span id="waitTxt">${esc(text)}</span></div>`;
  $('#hint').textContent = ''; NET && (NET.last = 0);
}
// Both halves are in: same seed, same math, same animation on both screens.
function resolveReady() {
  const m = NET.inbox['ready:' + G.seq]; delete NET.inbox['ready:' + G.seq];
  const opp = other(G.me);
  G.ratings[opp] = JSON.parse(JSON.stringify(m.ratings));
  if (G.pending) { G.cpuQ = m.q; G.cpuNotes = []; G.mods = Object.assign({}, G.mods, m.mods); return kickGo(); }
  if (userOnOffense()) G.defCall = m.call; else G.offCall = m.call;
  G.cpuQ = m.q; G.cpuNotes = (m.notes || []).map(n => `${opN()} ${n}`);
  G.mods = Object.assign({}, G.mods, m.mods);
  const oq = userOnOffense() ? G.userQ : G.cpuQ;
  if (oq === 'delay') return delayOfGame();
  snap();
}
// 4th down: the offense coach decides (go, punt, fg); the defense coach waits for it.
function sendFourth(choice) { netSend({ t: 'fourth', k: G.seq, choice }); }
function resolveFourth() {
  const m = NET.inbox['fourth:' + G.seq]; delete NET.inbox['fourth:' + G.seq];
  if (m.choice === 'go') { G.goForIt = true; showCalls(); } else { G.pending = { kind: m.choice, kicker: G.poss }; showCalls(); }
}
// Shown under the waiting dots if the other coach takes a long time.
setInterval(() => {
  if (G && (G.mode === 'wait' || G.mode === 'wait4') && performance.now() - G.waitStart > 45000 && $('#hint')) $('#hint').textContent = `Still waiting. If the ${opN()} coach left, press Exit / Start Over.`;
}, 2000);
