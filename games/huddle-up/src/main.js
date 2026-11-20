// Huddle Up field prototype (build step 2): Look C field, scrolling camera,
// one animated play (Run Inside), huddle questions with a second chance.
var INDEX_VERSION = '0.2.0 field prototype';
const QS = new URLSearchParams(location.search);
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const rnd = (a, b) => a + Math.random() * (b - a);
const irnd = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 0.75;
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

const PLAYS_PER_GAME = 12;
const CPU_MISS = 0.25; // Normal difficulty: computer misses its huddle 25% of the time
const OFF_CALLS = ['Run Inside', 'Run Outside', 'Short Pass', 'Deep Pass', 'Play Action'];
const DEF_CALLS = ['Blitz', 'Zone', 'Man Coverage', 'Stack the Box'];
const RUN_INSIDE_VS = { 'Blitz': 0, 'Zone': 1, 'Man Coverage': 1, 'Stack the Box': -1 }; // matchup chart row
const TEAMS = {
  home: { name: 'PELICANS', abbr: 'PEL', jersey: '#0E7C86', helmet: '#F28C28', pants: '#F4F1E8', num: '#FFFFFF', zone: '#0B5F67' },
  away: { name: 'COMETS', abbr: 'COM', jersey: '#5B2A86', helmet: '#F2C14E', pants: '#2B1640', num: '#FFFFFF', zone: '#43206A' },
};
const POS = ['QB', 'RB', 'WR', 'O-Line', 'D-Line', 'Linebacker', 'Secondary', 'Kicker'];

let G = null;
const QUESTIONS = SAMPLE_QUESTIONS.map(r => ({ q: r[0], a: r[1], w: [r[2], r[3], r[4]].filter(Boolean) }));

// ---------- game state ----------
function newGame() {
  const ratings = {};
  for (const side of ['home', 'away']) {
    ratings[side] = {};
    for (const p of POS) { const v = irnd(60, 70); ratings[side][p] = { start: v, now: v, hurt: 0 }; }
  }
  G = {
    score: { home: 0, away: 0 }, ballX: 25, down: 1, toGo: 10, play: 0, points: 0, right: 0, wrong: 0,
    ratings, deck: [], camX: 33, mode: 'call', actors: [], ball: null, anim: null, slowSnap: false,
    accom: { readAloud: $('#optRA').checked, reduced: $('#optRC').checked },
  };
  setFormation();
  G.camX = camTarget(G.ballX);
  updateHud();
  showCalls();
}
const rating = (side, p) => G.ratings[side][p].now;

// ---------- projection (same math as the Look C mockup) ----------
// World x: 0 = Pelicans goal line (left), 100 = Comets goal line (right). d: 0 far sideline, 1 near sideline.
function pt(f, d) { return [160 * (1 - d) + (960 + 320 * d) * f, 50 + 400 * d]; }
function proj(x, d) { return pt((x - G.camX) / 50 + 0.5, d); }
const camTarget = x => clamp(x + 8, 15, 85);

// ---------- formation ----------
function actor(team, pos, num, x, d, face, line) { return { team, pos, num, x, d, sx: x, sd: d, face, line: !!line, run: 0, moving: false, fall: 0, ball: false }; }
function setFormation() {
  const L = G.ballX, A = [];
  // offense (faces right)
  [[.38, 77], [.44, 52], [.50, 64], [.56, 70], [.62, 75]].forEach(([d, n], i) => A.push(Object.assign(actor('home', 'OL', n, L - 1, d, 1, true), { role: i === 2 ? 'C' : 'OL' })));
  A.push(Object.assign(actor('home', 'TE', 88, L - 1, .69, 1, true), { role: 'TE' }));
  A.push(Object.assign(actor('home', 'WR', 11, L - 0.8, .10, 1), { role: 'WR' }));
  A.push(Object.assign(actor('home', 'WR', 84, L - 0.8, .90, 1), { role: 'WR' }));
  A.push(Object.assign(actor('home', 'WR', 1, L - 2, .22, 1), { role: 'WR' }));
  A.push(Object.assign(actor('home', 'QB', 7, L - 3, .50, 1), { role: 'QB' }));
  A.push(Object.assign(actor('home', 'RB', 22, L - 7, .50, 1), { role: 'RB' }));
  // defense (faces left); alignment depends on its call once the play is called
  const call = G.defCall || 'Zone';
  const lbX = call === 'Stack the Box' ? 3.8 : call === 'Blitz' ? 2.6 : 5;
  const sX = call === 'Stack the Box' ? 7 : 11;
  const cbX = call === 'Man Coverage' ? 1.6 : 3.5;
  [[.41, 90], [.47, 94], [.53, 97], [.59, 99]].forEach(([d, n]) => A.push(Object.assign(actor('away', 'DL', n, L + 1.6, d, -1, true), { role: 'DL' })));
  [[.35, 50], [.50, 55], [.65, 58]].forEach(([d, n]) => A.push(Object.assign(actor('away', 'LB', n, L + lbX, d, -1), { role: 'LB' })));
  A.push(Object.assign(actor('away', 'CB', 21, L + cbX, .10, -1), { role: 'CB' }));
  A.push(Object.assign(actor('away', 'CB', 24, L + cbX, .90, -1), { role: 'CB' }));
  const sd = call === 'Stack the Box' ? [.40, .60] : [.30, .70];
  A.push(Object.assign(actor('away', 'S', 30, L + sX, sd[0], -1), { role: 'S' }));
  A.push(Object.assign(actor('away', 'S', 33, L + sX, sd[1], -1), { role: 'S' }));
  G.actors = A;
  G.ball = { x: L, d: .5, h: 4, carrier: null };
}
const byRole = r => G.actors.filter(a => a.role === r);

// ---------- drawing ----------
const cv = $('#field'), ctx = cv.getContext('2d');
function poly(pts, fill) { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
function seg(x1, d1, x2, d2, color, w, alpha) { const a = proj(x1, d1), b = proj(x2, d2); ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.globalAlpha = 1; }
function drawField() {
  ctx.clearRect(0, 0, 1280, 450);
  // stands
  ctx.fillStyle = '#14233D'; ctx.fillRect(0, 0, 1280, 50);
  const off = ((G.camX * 6) % 128 + 128) % 128;
  for (let i = -1; i < 11; i++) { ctx.fillStyle = ['#1E3A5F', '#24476F'][(i + 20) % 2]; ctx.beginPath(); ctx.roundRect(i * 128 + 6 - off, 30, 116, 10, 2); ctx.fill(); }
  // grass stripes (5-yard bands) and end zones
  for (let x = -10; x < 110; x += 5) {
    const inEZ = x < 0 || x >= 100;
    const col = inEZ ? (x < 0 ? TEAMS.home.zone : TEAMS.away.zone) : ['#3E8E41', '#37803A'][(x / 5) % 2];
    poly([proj(x, 0), proj(x + 5, 0), proj(x + 5, 1), proj(x, 1)], col);
  }
  // outside the end lines
  poly([proj(-60, 0), proj(-10, 0), proj(-10, 1), proj(-60, 1)], '#2F6E33');
  poly([proj(110, 0), proj(160, 0), proj(160, 1), proj(110, 1)], '#2F6E33');
  // end zone names
  for (const [x, t] of [[-5, TEAMS.home], [105, TEAMS.away]]) {
    const [px, py] = proj(x, .5); const s = 0.7 + 0.5 * .5;
    ctx.save(); ctx.translate(px, py); ctx.scale(s, s * 0.55); ctx.rotate(x < 0 ? -Math.PI / 2 : Math.PI / 2);
    ctx.font = '800 60px "Barlow Condensed", "Arial Narrow", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillText(t.name, 0, 0); ctx.restore();
  }
  // yard lines
  for (let x = 0; x <= 100; x += 5) seg(x, 0, x, 1, '#F4F4F4', x % 100 === 0 ? 4 : 2.5, .85);
  seg(-10, 0, -10, 1, '#F4F4F4', 4); seg(110, 0, 110, 1, '#F4F4F4', 4);
  seg(-10, 0, 110, 0, '#F4F4F4', 3.5); seg(-10, 1, 110, 1, '#F4F4F4', 4.5);
  // hash marks
  for (let x = 1; x < 100; x++) { if (x % 5 === 0) continue; for (const d of [.02, .36, .64, .98]) seg(x, d - .012, x, d + .012, '#F4F4F4', 1.5, .7); }
  // numbers
  ctx.textAlign = 'center'; ctx.fillStyle = '#FFFFFF';
  for (let x = 10; x <= 90; x += 10) {
    const label = String(x <= 50 ? x : 100 - x);
    const [nx, ny] = proj(x, .93); ctx.globalAlpha = .8; ctx.font = '700 36px "Barlow Condensed", "Arial Narrow", Arial, sans-serif'; ctx.textBaseline = 'alphabetic'; ctx.fillText(label, nx, 438);
    const [fx] = proj(x, .07); ctx.save(); ctx.globalAlpha = .7; ctx.translate(fx, 82); ctx.rotate(Math.PI); ctx.font = '700 21px "Barlow Condensed", "Arial Narrow", Arial, sans-serif'; ctx.fillText(label, 0, 0); ctx.restore();
  }
  ctx.globalAlpha = 1;
  // line of scrimmage and first-down line (before the snap)
  if (G.mode !== 'anim' && G.mode !== 'result') {
    seg(G.ballX, 0, G.ballX, 1, '#3B82F6', 4.5);
    const fd = G.ballX + G.toGo; if (fd < 100) seg(fd, 0, fd, 1, '#FACC15', 4.5);
  }
  // depth shading
  const gr = ctx.createLinearGradient(0, 50, 0, 450); gr.addColorStop(0, 'rgba(0,0,0,.22)'); gr.addColorStop(.5, 'rgba(0,0,0,0)');
  poly([[160, 50], [1120, 50], [1280, 450], [0, 450]], gr);
  // ad wall
  ctx.fillStyle = '#0B1526'; ctx.fillRect(0, 40, 1280, 10);
  for (let i = -1; i < 11; i++) { ctx.fillStyle = ['#1D4ED8', '#FACC15'][(i + 20) % 2]; ctx.fillRect(i * 128 + 10 - off, 42, 108, 6); }
}

function rr(x, y, w, h, r, fill) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); }
function drawPlayer(a) {
  const [sx, sy] = proj(a.x, a.d); const sc = 0.7 + 0.5 * a.d; const t = TEAMS[a.team];
  if (sx < -60 || sx > 1340) return;
  ctx.save(); ctx.translate(sx, sy); ctx.scale(sc, sc);
  ctx.save(); ctx.filter = 'blur(1.5px)'; ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(a.fall * a.face * 18, 0, 19 + a.fall * 14, 4, 0, 0, 7); ctx.fill(); ctx.restore();
  if (a.fall) ctx.rotate(a.face * a.fall * 1.35);
  const lean = a.line ? 0.12 : (a.moving ? 0.16 : 0);
  ctx.transform(1, 0, -a.face * lean, 1, 0, 0);
  const lh = a.line ? 9 : 14, gap = a.line ? 9 : 3, lw = 10;
  const sw = a.moving ? Math.sin(a.run) * 4.5 : 0, lift = a.moving ? Math.abs(Math.cos(a.run)) * 2 : 0;
  // legs and shoes
  for (const [lx, s] of [[-gap / 2 - lw, 1], [gap / 2, -1]]) {
    const dx = sw * s * a.face, up = s > 0 ? lift : 2 - lift;
    rr(lx + dx, -5 - lh - up, lw, lh, [0, 0, 4, 4], t.pants);
    rr(lx + dx - 2 + (a.face > 0 ? 2 : 0), -5 - up, 14, 5, 3, '#111111');
  }
  const by = -5 - lh - 29 + 1;
  // arms
  const armSw = a.moving ? -sw * 0.6 : 0;
  rr(-15 - 6, by + 3 + armSw * a.face * 0.3, 9, 21, 5, t.jersey);
  rr(15 - 3, by + 3 - armSw * a.face * 0.3, 9, 21, 5, t.jersey);
  // body with shading
  ctx.save(); ctx.beginPath(); ctx.roundRect(-15, by, 30, 29, [9, 9, 5, 5]); ctx.fillStyle = t.jersey; ctx.fill(); ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(11, by, 4, 29); ctx.fillRect(-15, by + 24, 30, 5);
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(-15, by, 3, 29); ctx.fillRect(-15, by, 30, 3); ctx.restore();
  ctx.fillStyle = t.num; ctx.font = '800 17px "Barlow Condensed", "Arial Narrow", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(a.num, 0, by + 15);
  // helmet
  const hy = by - 21;
  ctx.save(); ctx.beginPath(); ctx.roundRect(-12, hy, 24, 22, [12, 12, 9, 9]); ctx.fillStyle = t.helmet; ctx.fill(); ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(8, hy, 4, 22); ctx.fillRect(-12, hy + 17, 24, 5);
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(-12, hy, 3, 22);
  ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(-2.5, hy, 5, 13); ctx.restore();
  // face mask on the facing side
  ctx.strokeStyle = '#D9DEE5'; ctx.lineWidth = 2; const mx = a.face > 0 ? 9 : -18;
  ctx.beginPath(); ctx.roundRect(mx, hy + 10, 9, 9, a.face > 0 ? [0, 5, 5, 0] : [5, 0, 0, 5]); ctx.stroke();
  // ball in arms
  if (a.ball) drawBallShape(a.face * 12, by + 13, 1);
  ctx.restore();
}
function drawBallShape(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath(); ctx.ellipse(0, 0, 9, 5.5, 0, 0, 7); ctx.fillStyle = '#8B4A1C'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#3A1D0A'; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.fillRect(-4, -1, 8, 2); ctx.restore();
}
function draw() {
  drawField();
  const items = G.actors.map(a => ({ d: a.d, f: () => drawPlayer(a) }));
  const b = G.ball;
  if (!b.carrier) items.push({ d: b.d + 0.001, f: () => { const [x, y] = proj(b.x, b.d); const sc = 0.7 + 0.5 * b.d; drawBallShape(x, y - b.h * sc, sc); } });
  items.sort((p, q) => p.d - q.d).forEach(i => i.f());
  if (G.flag) { const [x, y] = proj(G.flag.x, G.flag.d); ctx.fillStyle = '#FACC15'; ctx.beginPath(); ctx.ellipse(x, y - 2, 9, 4, 0, 0, 7); ctx.fill(); }
}

// ---------- the play animation ----------
function planRunInside(res) {
  const L = G.ballX, a = res.yds, endX = res.td ? 104 : L + a;
  const gapD = pick([.47, .53]);
  const endD = clamp(gapD + rnd(-.08, .08) + (a > 12 ? rnd(-.15, .15) : 0), .08, .92);
  const P = { L, endX, gapD, endD, push: res.slow ? -0.4 : clamp(0.2 + res.total * 1.6, -0.6, 1.6) };
  // RB path: start -> handoff -> gap -> end
  const pts = [[0, L - 7, .5], [0.35, L - 7, .5], [0.85, L - 3.4, .5]];
  if (endX > L + 0.3) {
    const t2 = 0.85 + Math.hypot(3.7, (gapD - .5) * 53) / 7;
    pts.push([t2, L + 0.3, gapD]);
    pts.push([t2 + Math.hypot(endX - L - 0.3, (endD - gapD) * 53) / (a > 12 ? 8.5 : 7.5), endX, endD]);
  } else {
    pts.push([0.85 + Math.max(0.35, (endX - (L - 3.4)) / 6), endX, gapD]);
  }
  P.rb = pts; P.T = pts[pts.length - 1][0];
  // who makes the tackle
  const defs = G.actors.filter(x => x.team === 'away');
  const pool = res.td ? [] : a <= 0 ? byRole('DL') : a <= 7 ? byRole('LB') : byRole('S').concat(byRole('CB'));
  P.tackler = pool.length ? pool.reduce((m, x) => Math.hypot(x.x - endX, (x.d - endD) * 53) < Math.hypot(m.x - endX, (m.d - endD) * 53) ? x : m) : null;
  defs.forEach((x, i) => {
    if (x === P.tackler) { x.tx = endX + 0.8; x.td = endD + 0.01; x.k = 1; return; }
    const ang = (i * 2.4) % 6.28, rad = res.td ? 3 + (i % 4) : 1.6 + (i % 3) * 0.9;
    x.tx = endX + Math.cos(ang) * rad + (res.td ? -3 : 1); x.td = clamp(endD + Math.sin(ang) * rad / 53, .03, .97);
    x.k = x.role === 'DL' ? 0.35 : x.role === 'CB' ? 0.75 : 0.9;
  });
  return P;
}
function rbAt(P, t) {
  const p = P.rb; if (t <= p[0][0]) return [p[0][1], p[0][2]];
  for (let i = 1; i < p.length; i++) if (t <= p[i][0]) { const u = (t - p[i - 1][0]) / (p[i][0] - p[i - 1][0]); return [lerp(p[i - 1][1], p[i][1], u), lerp(p[i - 1][2], p[i][2], u)]; }
  const l = p[p.length - 1]; return [l[1], l[2]];
}
function pose(P, t) {
  const L = P.L, snap = 0.35, Tn = P.T, play = clamp((t - snap) / (Tn - snap), 0, 1);
  for (const a of G.actors) {
    const px = a.x, pd = a.d;
    switch (a.role) {
      case 'RB': { const [x, d] = rbAt(P, t); a.x = x; a.d = d; break; }
      case 'QB': { const u = ease((t - snap) / 0.45); a.x = a.sx - 0.6 * u - 1.4 * ease((t - 0.85) / 0.6); a.d = a.sd + 0.03 * u - 0.07 * ease((t - 0.85) / 0.6); break; }
      case 'OL': case 'C': case 'TE': { const u = ease((t - snap) / 0.6); a.x = a.sx + P.push * u + (t > snap ? Math.sin(t * 9 + a.sd * 40) * 0.08 : 0); break; }
      case 'WR': { const u = ease((t - snap) / 1.2); a.x = a.sx + 6 * u; break; }
      case 'DL': {
        if (a === P.tackler) { a.x = lerp(a.sx, a.tx, ease(play)); a.d = lerp(a.sd, a.td, ease(play)); break; }
        const u = ease((t - snap) / 0.6); a.x = a.sx + (P.push - 0.8) * u + (t > snap ? Math.sin(t * 8 + a.sd * 30) * 0.08 : 0);
        a.x += (a.tx - a.sx) * a.k * ease((t - snap - 0.6) / Math.max(0.3, Tn - snap - 0.6)) * 0.5; break;
      }
      default: { // LB, CB, S chase the ball carrier
        const u = ease(play) * a.k; a.x = lerp(a.sx, a.tx, u); a.d = lerp(a.sd, a.td, u);
        if (a.role === 'CB' && t < snap + 0.8) a.x = a.sx + 1.5 * ease((t - snap) / 0.8);
      }
    }
    const moved = Math.hypot(a.x - px, (a.d - pd) * 53);
    a.moving = moved > 0.004 || (a.line && t > snap && t < Tn);
    a.run += moved * 1.7 + (a.line && t > snap && t < Tn ? 0.12 : 0);
  }
  // ball: snap to QB, handoff to RB
  const b = G.ball, qb = byRole('QB')[0], rb = byRole('RB')[0];
  if (t < snap) { b.x = L; b.d = .5; b.h = 4; b.carrier = null; }
  else if (t < 0.85) { const u = clamp((t - snap) / 0.15, 0, 1); if (u < 1) { b.x = lerp(L, qb.x, u); b.d = .5; b.h = 4 + 26 * u; b.carrier = null; qb.ball = false; } else { b.carrier = qb; qb.ball = true; } }
  else { qb.ball = false; rb.ball = true; b.carrier = rb; }
  if (b.carrier) { b.x = b.carrier.x; b.d = b.carrier.d; }
  // tackle
  const after = t - Tn;
  if (after > 0) {
    G.actors.forEach(a => { a.moving = false; });
    if (P.tackler) { const f = ease(after / 0.35); rb.fall = f; P.tackler.fall = f; }
  }
}

// ---------- result math (matchup ~40%, huddle ~35%, ratings ~15%, luck ~10%) ----------
function resolveRunInside(huddle) {
  const call = G.defCall, defMissed = G.defMissed;
  const m = RUN_INSIDE_VS[call];
  const hq = clamp((huddle === 'clean' ? 0.6 : -0.4) + (defMissed ? 0.4 : -0.3), -1, 1);
  const r = clamp((rating('home', 'RB') + rating('home', 'O-Line') - rating('away', 'D-Line') - rating('away', 'Linebacker')) / 20, -1, 1);
  const luck = rnd(-1, 1);
  const total = 0.40 * m + 0.35 * hq + 0.15 * r + 0.10 * luck;
  let yds = Math.round(3 + total * 7 + gauss() * 2);
  if (G.slowSnap) yds -= 2;
  if (total > 0.15 && Math.random() < 0.06 + 0.15 * total) yds += irnd(12, 35);
  yds = Math.max(yds, -4);
  if (G.ballX + yds <= 0) yds = 1 - G.ballX; // keep it out of the end zone (safeties come later)
  const td = G.ballX + yds >= 100;
  if (td) yds = 100 - G.ballX;
  return { call, defMissed, yds, td, total, slow: G.slowSnap };
}

// ---------- flow ----------
function showCalls() {
  G.mode = 'call'; hideBanner();
  $('#label').textContent = 'Coach Pelicans · Offense · Call the play';
  $('#calls').innerHTML = OFF_CALLS.map(c => c === 'Run Inside' ? `<button class="call" data-call="${c}">${c}</button>` : `<button class="call" disabled>${c}<small>Coming in step 3</small></button>`).join('');
  $('#hint').textContent = 'Only Run Inside is ready in this prototype.';
  $('[data-call="Run Inside"]').onclick = () => callPlay('Run Inside');
}
function showNext(text, fn) {
  $('#calls').innerHTML = `<button class="go" id="nextBtn">${text}</button>`;
  $('#hint').textContent = '';
  $('#nextBtn').onclick = fn;
}
function callPlay(call) {
  G.offCall = call; G.defCall = pick(DEF_CALLS); G.defMissed = Math.random() < CPU_MISS; G.slowSnap = false;
  openHuddle(1);
}
function nextQuestion() {
  if (!G.deck.length) G.deck = shuffle(QUESTIONS.map((_, i) => i));
  const src = QUESTIONS[G.deck.pop()];
  let wrong = shuffle(src.w); if (G.accom.reduced) wrong = wrong.slice(0, 2); else wrong = wrong.slice(0, 3);
  return { src, choices: shuffle([{ text: src.a, right: true }].concat(wrong.map(w => ({ text: w, right: false })))) };
}
function openHuddle(attempt) {
  G.mode = 'huddle'; G.attempt = attempt; G.q = nextQuestion(); G.answered = false;
  $('#hTitle').textContent = 'Offense huddle · ' + G.offCall;
  $('#hTry').textContent = attempt === 1 ? '' : 'Second chance';
  $('#qText').textContent = G.q.src.q;
  $('#choices').innerHTML = G.q.choices.map((c, i) => `<button class="choice" data-i="${i}"><span class="let">${'ABCD'[i]}</span><span>${esc(c.text)}</span></button>`).join('');
  $$('.choice').forEach(b => b.onclick = () => answer(+b.dataset.i));
  $('#fb').textContent = ''; $('#fb').className = ''; $('#hNext').style.display = 'none';
  $('#hSpeak').style.display = G.accom.readAloud ? '' : 'none';
  $('#huddle').classList.add('show');
  if (G.accom.readAloud) readQuestion();
}
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function readQuestion() { speak(G.q.src.q + '. ' + G.q.choices.map((c, i) => 'ABCD'[i] + '. ' + c.text).join('. ')); }
function speak(text) { try { if (!window.speechSynthesis) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = 0.95; speechSynthesis.speak(u); } catch (e) { } }
function stopSpeech() { try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) { } }

function answer(i) {
  if (G.answered) return; G.answered = true;
  const c = G.q.choices[i];
  $$('.choice').forEach((b, j) => { b.disabled = true; if (G.q.choices[j].right) b.classList.add('right'); });
  if (!c.right) $$('.choice')[i].classList.add('wrong');
  const fb = $('#fb'), next = $('#hNext');
  let say;
  if (c.right) {
    G.right++;
    const pts = G.attempt === 1 ? 2 : 1; G.points += pts; popPoints(pts);
    G.huddle = G.attempt === 1 ? 'clean' : 'shaky';
    fb.className = 'good';
    fb.textContent = G.attempt === 1 ? 'Correct! Clean execution. +2 skill points.' : 'Correct! Confusion cleared up. +1 skill point.';
    next.textContent = 'Snap the ball'; next.onclick = snap;
  } else if (G.attempt === 1) {
    G.wrong++;
    const pen = firstMissPenalty();
    fb.className = 'bad'; fb.textContent = 'Not quite. Penalty: ' + pen + ' Answer one more to clear it up.';
    next.textContent = 'Second chance question'; next.onclick = () => openHuddle(2);
  } else {
    G.wrong++;
    fb.className = 'bad'; fb.textContent = 'Not quite. Flag on the play: delay of game, 5 yards. Replay the down.';
    next.textContent = 'Back to the line'; next.onclick = delayOfGame;
  }
  say = (c.right ? 'Correct. ' : 'Not quite. The correct answer is: ' + G.q.src.a + '. ') + fb.textContent.replace(/^(Correct!|Not quite\.)\s*/, '');
  if (G.accom.readAloud) speak(say);
  updateHud();
  next.style.display = 'block';
}
// First miss: ONE random penalty from the options that can actually happen right now.
function firstMissPenalty() {
  const opts = ['field'];
  const inPlay = ['RB', 'O-Line'].filter(p => G.ratings.home[p].now > G.ratings.home[p].start);
  if (inPlay.length) opts.push('rating');
  if (G.points > 0) opts.push('point');
  const o = pick(opts);
  if (o === 'field') { G.slowSnap = true; return 'slower snap and worse blocking on this play.'; }
  if (o === 'rating') { const p = pick(inPlay), r = G.ratings.home[p], was = r.now; r.now = Math.max(r.start, r.now - 2); return `${p} loses 2 rating points (${was} to ${r.now}).`; }
  G.points--; return 'the team loses 1 unspent skill point.';
}
function popPoints(n) {
  const p = $('#pop'); p.textContent = `+${n} skill point${n > 1 ? 's' : ''}!`; p.classList.remove('show'); void p.offsetWidth; p.classList.add('show');
  const c = $('#chip'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
}
function closeHuddle() { $('#huddle').classList.remove('show'); stopSpeech(); }

function delayOfGame() {
  closeHuddle();
  const back = G.ballX < 10 ? Math.round(G.ballX) / 2 : 5;
  G.ballX -= back; G.toGo += back; G.play++;
  G.flag = { x: G.ballX + back - 1, d: .45 };
  setFormation();
  banner('Flag · Delay of game', `5-yard penalty · Replay ${ord(G.down)} down`, 'flag');
  G.mode = 'result'; updateHud();
  showNext(G.play >= PLAYS_PER_GAME ? 'See results' : 'Next play', afterResult);
}
function snap() {
  closeHuddle();
  const res = resolveRunInside(G.huddle);
  setFormation(); // re-align the defense to its call
  G.res = res; G.plan = planRunInside(res); G.mode = 'anim'; G.t0 = performance.now(); G.flag = null;
  $('#label').textContent = `Run Inside vs ${res.call}`;
  $('#calls').innerHTML = ''; $('#hint').textContent = '';
}
function finishPlay() {
  const r = G.res; G.play++;
  let big, small, cls = '';
  if (r.td) {
    G.score.home += 7; big = 'Touchdown!'; small = `${r.yds}-yard run · Extra point is automatic for now`; cls = 'td';
  } else {
    G.ballX += r.yds;
    big = r.yds > 0 ? `Gain of ${r.yds}` : r.yds === 0 ? 'No gain' : `Loss of ${-r.yds}`;
    if (r.yds >= G.toGo) { G.down = 1; G.toGo = Math.min(10, 100 - G.ballX); big = r.yds >= 20 ? `Big run! ${r.yds} yards` : big; small = 'First down!'; }
    else { G.down++; G.toGo -= r.yds; small = ''; }
    if (G.down > 4) { small = 'Turnover on downs · Defense comes in step 3, so you get a new drive at the 25'; }
  }
  const defNote = `Comets called ${r.call}` + (r.defMissed ? ' and missed their huddle' : '') + (G.huddle === 'shaky' ? ' · Your second-chance huddle slowed the play' : '');
  banner(big, [small, defNote].filter(Boolean).join(' · '), cls);
  if (r.td || G.down > 4) { G.ballX = 25; G.down = 1; G.toGo = 10; G.pendingReset = true; }
  G.mode = 'result'; updateHud();
  $('#label').textContent = 'Result';
  showNext(G.play >= PLAYS_PER_GAME ? 'See results' : 'Next play', afterResult);
}
function afterResult() {
  G.flag = null; G.pendingReset = false;
  if (G.play >= PLAYS_PER_GAME) return showFinal();
  G.defCall = null; setFormation(); showCalls(); updateHud();
}
function banner(b1, b2, cls) { $('#b1').textContent = b1; $('#b2').textContent = b2 || ''; $('#b2').style.display = b2 ? '' : 'none'; const b = $('#banner'); b.className = ''; void b.offsetWidth; b.className = 'show ' + (cls || ''); }
function hideBanner() { $('#banner').className = ''; }
function showFinal() {
  G.mode = 'final';
  $('#fHome').textContent = G.score.home; $('#fAway').textContent = G.score.away;
  const n = G.right + G.wrong;
  $('#fStats').innerHTML = `Questions right: <b>${G.right}</b> · wrong: <b>${G.wrong}</b>${n ? ` (${Math.round(100 * G.right / n)}%)` : ''}<br>Skill points saved: <b>${G.points}</b> (spending them on players comes in step 4)`;
  $('#final').classList.add('show');
}
const ord = n => ['1st', '2nd', '3rd', '4th'][n - 1] || n + 'th';
function spot(x) { x = Math.round(x); return x === 50 ? 'the 50' : x < 50 ? `PEL ${x}` : `COM ${100 - x}`; }
function updateHud() {
  $('#homeScore').textContent = G.score.home; $('#awayScore').textContent = G.score.away;
  const goal = G.ballX + G.toGo >= 100;
  $('#dd').textContent = `${ord(G.down)} & ${goal ? 'Goal' : Math.max(1, Math.round(G.toGo))} · Ball on ${spot(G.ballX)}`;
  $('#sub').textContent = `Prototype drive · Play ${Math.min(G.play + 1, PLAYS_PER_GAME)} of ${PLAYS_PER_GAME}`;
  $('#chip').textContent = `Skill points: ${G.points}`;
}

// ---------- main loop ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (G) {
    if (G.mode === 'anim') {
      const t = (now - G.t0) / 1000;
      pose(G.plan, t);
      if (t > G.plan.T + 0.9) finishPlay();
    }
    const target = G.mode === 'result' && G.pendingReset ? camTarget(G.ball.x) : camTarget(G.mode === 'anim' || G.mode === 'result' ? G.ball.x : G.ballX);
    G.camX += (target - G.camX) * Math.min(1, dt * 3.5);
    draw();
  }
  requestAnimationFrame(frame);
}

// ---------- screen fit, buttons, start ----------
function fit() { const s = Math.min(innerWidth / 1280, innerHeight / 720); $('#stage').style.transform = `scale(${s})`; }
addEventListener('resize', fit); fit();
$('#optRA').checked = QS.get('ra') === '1'; $('#optRC').checked = QS.get('rc') === '1';
$('#ver').textContent = 'Build ' + INDEX_VERSION;
$('#kick').onclick = () => { $('#title').classList.remove('show'); newGame(); };
$('#again').onclick = () => { $('#final').classList.remove('show'); newGame(); };
$$('[data-exit]').forEach(b => b.onclick = () => { stopSpeech(); closeHuddle(); $('#final').classList.remove('show'); $('#title').classList.add('show'); newGame(); G.mode = 'title'; });
$('#hSpeak').onclick = readQuestion;
addEventListener('keydown', e => {
  if (G && G.mode === 'huddle' && !G.answered) { const k = 'abcd'.indexOf(e.key.toLowerCase()); const n = '1234'.indexOf(e.key); const i = k >= 0 ? k : n; if (i >= 0 && i < G.q.choices.length) answer(i); }
});
newGame(); G.mode = 'title';
(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(frame));
