// ---------- drawing (Look C) ----------
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
    const fd = G.ballX + dir() * G.toGo; if (!G.pending && fd > 0 && fd < 100) seg(fd, 0, fd, 1, '#FACC15', 4.5);
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
// Red-cross trainer icon over any player who is shaken up (either team, when he is on the field).
function drawTrainerIcons() {
  for (const t of ['home', 'away']) for (const p of POS) {
    const r = G.ratings[t][p]; if (!r.hurt || !POS_ROLE[p]) continue;
    const [rl, i] = POS_ROLE[p];
    const a = G.actors.filter(x => x.team === t && x.role === rl)[i]; if (!a) continue;
    const [sx, sy] = proj(a.x, a.d), sc = 0.7 + 0.5 * a.d, y = sy - 82 * sc;
    if (sx < -30 || sx > 1310) continue;
    ctx.beginPath(); ctx.arc(sx, y, 11, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#B91C1C'; ctx.stroke();
    ctx.fillStyle = '#DC2626'; ctx.fillRect(sx - 2.5, y - 7, 5, 14); ctx.fillRect(sx - 7, y - 2.5, 14, 5);
  }
}
function draw() {
  drawField();
  const items = G.actors.map(a => ({ d: a.d, f: () => drawPlayer(a) }));
  items.push({ d: .5, f: drawGoalPosts });
  const b = G.ball;
  if (!b.carrier) items.push({ d: b.d + 0.001, f: () => { const [x, y] = proj(b.x, b.d); const sc = 0.7 + 0.5 * b.d; drawBallShape(x, y - b.h * sc, sc); } });
  items.sort((p, q) => p.d - q.d).forEach(i => i.f());
  drawTrainerIcons();
  if (G.flag) { const [x, y] = proj(G.flag.x, G.flag.d); ctx.fillStyle = '#FACC15'; ctx.beginPath(); ctx.ellipse(x, y - 2, 9, 4, 0, 0, 7); ctx.fill(); }
}

