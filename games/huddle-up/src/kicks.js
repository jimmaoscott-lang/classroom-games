
// ---------- special teams (build step 7) ----------
// Kickoff, kick return, punt, field goal and extra point. They use the same huddle as plays.
// G.pending = { kind: 'kickoff' | 'punt' | 'fg' | 'pat', kicker: 'home' | 'away', spot } while a kick is next.
// Animations work in the kicking team's frame: G.poss = kicking team, u = yards toward the receiving team's goal.
const KICK_NAMES = { kickoff: 'Kickoff', punt: 'Punt', fg: 'Field goal', pat: 'Extra point' };
const HUDDLE_NAMES = { offense: 'Offense huddle', defense: 'Defense huddle', kickoff: 'Kickoff huddle', return: 'Return huddle', punt: 'Punt huddle', fg: 'Field goal huddle', pat: 'Extra point huddle' };
const KICK_PHASES = ['kickoff', 'return', 'punt', 'fg', 'pat'];
// Players "in the play" for the first-miss rating penalty, by huddle phase.
const PHASE_PLAYERS = { kickoff: ['Kicker'], punt: ['Kicker'], fg: ['Kicker'], pat: ['Kicker'], return: ['RB', 'WR'] };
const KNUM = { home: 4, away: 9 };          // kicker jersey numbers
const fgDistance = () => Math.round(ytg() + 17); // 7-yard snap + 10-yard end zone
const FG_MAX = 62;                          // longest field goal the coach can try
// Field goal make chance: a 65 kicker makes about half from 48 yards; a 100 kicker from about 58.
function fgChance(dist, k, mods, kq) {
  const d50 = 48 + (k - 65) * 0.3 - (mods && mods.shortKick ? 6 : 0);
  const p = 1 / (1 + Math.exp((dist - d50) / 4.5));
  return kq === 'bad' ? p * 0.2 : p;
}

// ---------- formations ----------
function setKickFormation(kind) {
  const L = G.ballX, s = dir(), O = G.poss, D = other(O), A = [];
  const add = (team, side, role, num, u, d, line) => A.push({ team, side, role, num, u0: u, d0: d, u, d, x: L + s * u, face: side === 'off' ? s : -s, line: !!line, run: 0, moving: false, fall: 0, ball: false, keys: null, fallAt: null });
  const on = NUMS[O].off, od = NUMS[O].def, dn = NUMS[D].def, doff = NUMS[D].off;
  const kN = [].concat(on.OL, od.LB, od.CB, od.S, on.WR, on.TE), rN = [].concat(dn.DL, dn.LB, dn.CB, dn.S, doff.WR);
  const toGoal = ytg();
  if (kind === 'kickoff') {
    add(O, 'off', 'K', KNUM[O], -7, .5);
    [.06, .15, .24, .33, .42, .58, .67, .76, .85, .94].forEach((d, i) => add(O, 'off', 'KC', kN[i], -1, d));
    [.2, .35, .5, .65, .8].forEach((d, i) => add(D, 'def', 'RL', rN[i], 12, d));
    [.25, .42, .58, .75].forEach((d, i) => add(D, 'def', 'RL', rN[5 + i], 26, d));
    add(D, 'def', 'RL', rN[9], Math.min(toGoal - 7, 55), .36);
    add(D, 'def', 'KR', doff.RB[0], Math.min(toGoal - 3, 60), .56);
  } else if (kind === 'punt') {
    [.38, .44, .5, .56, .62].forEach((d, i) => add(O, 'off', i === 2 ? 'C' : 'OL', on.OL[i], -1, d, true));
    add(O, 'off', 'OL', on.TE[0], -1, .32, true); add(O, 'off', 'OL', od.LB[0], -1, .68, true);
    add(O, 'off', 'GU', on.WR[0], -1, .08); add(O, 'off', 'GU', on.WR[1], -1, .92);
    add(O, 'off', 'PP', od.LB[1], -5, .5);
    add(O, 'off', 'P', KNUM[O], -14, .5);
    [.33, .41, .47, .53, .59, .67].forEach((d, i) => add(D, 'def', 'DL', rN[i], 1.6, d, true));
    add(D, 'def', 'JM', dn.CB[0], 1, .1); add(D, 'def', 'JM', dn.CB[1], 1, .9);
    add(D, 'def', 'RL', dn.S[0], 12, .4); add(D, 'def', 'RL', dn.S[1], 12, .6);
    add(D, 'def', 'KR', doff.RB[0], Math.min(toGoal - 3, 42), .5);
  } else { // field goal or extra point
    for (let i = 0; i < 9; i++) add(O, 'off', i === 4 ? 'C' : 'OL', kN[i], -1, .5 + (i - 4) * .042, true);
    add(O, 'off', 'H', on.QB[0], -7, .5);
    add(O, 'off', 'K', KNUM[O], -9.5, .56);
    for (let i = 0; i < 9; i++) add(D, 'def', 'DL', rN[i], 1.6, .5 + (i - 4) * .045, true);
    add(D, 'def', 'S', dn.S[0], 8, .4); add(D, 'def', 'S', dn.S[1], 8, .6);
  }
  G.actors = A;
  G.ball = { x: L, d: .5, h: kind === 'kickoff' ? 3 : 4, carrier: null };
}

// ---------- result math ----------
// kq: kicking team huddle 'clean' | 'shaky' | 'bad'. rq: return team huddle (kickoff and punt only).
// mods.shortKick: first-miss effect for the kicker (shorter kick, harder field goal).
// mods.badBlock: first-miss effect for the return team (blocking breaks down).
// Returns use the same idea as plays: huddles ~70%, returner (RB) vs coverage (Linebacker) ~15%, luck ~10%.
function resolveKick(kind, kq, rq, mods) {
  mods = mods || {};
  const Kt = G.poss, R = other(Kt), toGoal = ytg(), own = 100 - toGoal, k = effRating(Kt, 'Kicker');
  const res = { kind, kick: true, kq, rq };
  const edge = clamp((effRating(R, 'RB') - effRating(Kt, 'Linebacker')) / DUEL_SPAN, -1, 1);
  const doReturn = (catchU, base, spread, bigLo, bigHi) => {
    let T = 0.35 * (rq === 'clean' ? 0.5 : -0.4) + 0.35 * (kq === 'clean' ? -0.2 : 0.2) + 0.15 * edge + 0.1 * rnd(-1, 1);
    if (mods.badBlock) T -= 0.25;
    let y = Math.round(base + T * spread + gauss() * spread * 0.45);
    if (Math.random() < 0.025 + 0.07 * Math.max(T, 0)) y += irnd(bigLo, bigHi);
    y = Math.max(0, y);
    let endU = Math.min(catchU - y, toGoal - (catchU >= toGoal ? 8 : 1)); // a return out of the end zone gets at least to the 8
    if (endU <= -own) { res.td = true; endU = -own - 3; }
    else if (Math.random() < (rq === 'bad' ? 0.12 : 0.015)) res.fumble = true;
    Object.assign(res, { out: 'return', T, catchU, endU, ret: Math.max(0, Math.round(catchU - endU)) });
  };
  if (kind === 'kickoff') {
    if (kq === 'bad') { Object.assign(res, { out: 'oob', land: irnd(25, 40), landD: pick([-0.06, 1.06]) }); return res; }
    const dist = Math.round(64 + (k - 65) * 0.15 + gauss() * 4 - (mods.shortKick ? 10 : 0));
    res.land = Math.min(dist, toGoal + 8); res.landD = clamp(.5 + gauss() * .12, .2, .8);
    if (res.land >= toGoal + 3 || (res.land >= toGoal && Math.random() < 0.6)) { res.out = 'touchback'; return res; }
    doReturn(res.land, 22, 15, 15, 60);
    return res;
  }
  if (kind === 'punt') {
    if (kq === 'bad') {
      if (Math.random() < 0.45) { Object.assign(res, { out: 'blocked', endU: Math.max(-irnd(6, 12), -own + 1), landD: clamp(.5 + gauss() * .06, .4, .6) }); return res; }
      Object.assign(res, { out: 'shank', land: Math.min(irnd(12, 25), toGoal - 1), landD: pick([-0.06, 1.06]) }); return res;
    }
    const dist = clamp(Math.round(41 + (k - 65) * 0.12 + gauss() * 5 - (mods.shortKick ? 8 : 0)), 20, 65);
    res.landD = clamp(.5 + gauss() * .1, .25, .75);
    if (dist >= toGoal) { Object.assign(res, { out: 'touchback', land: toGoal + 4 }); return res; }
    res.land = dist;
    if (toGoal - dist <= 8) { res.out = 'downed'; return res; }
    if (Math.random() < (kq === 'clean' ? 0.3 : 0.12)) { res.out = 'fair'; return res; }
    doReturn(dist, 7, 9, 12, 45);
    return res;
  }
  // field goal or extra point
  res.dist = fgDistance();
  res.good = Math.random() < fgChance(res.dist, k, mods, kq);
  if (!res.good) res.miss = kq === 'bad' ? 'Bad snap' : (res.dist > 48 + (k - 65) * 0.3 && Math.random() < 0.5) ? 'Short' : pick(['Wide left', 'Wide right']);
  return res;
}

// ---------- animation planning ----------
function planKick(res) {
  const A = G.actors; A.forEach(a => { a.keys = [[0, a.u0, a.d0]]; a.fallAt = null; a.ball = false; a.fall = 0; });
  const P = { ball: [], T: 0, res, kick: true }, B = sg => P.ball.push(sg);
  const toGoal = ytg(), by = r => A.find(a => a.role === r);
  const kickTeam = offense(), recv = defense();
  if (res.kind === 'kickoff') {
    const k0 = by('K'), kr = by('KR'), tK = 0.75, tL = tK + 2.4;
    K(k0, tK, -0.3, .5);
    B({ t0: 0, t1: tK, type: 'spot', u: 0, d: .5, h: 3 });
    kickTeam.filter(a => a !== k0).forEach(a => K(a, tK, a.u0 + 1.5, a.d0));
    if (res.out === 'oob') {
      B({ t0: tK, t1: tL, type: 'fly', from: [0, .5, 3], to: [res.land, res.landD, 0], arc: 160 });
      B({ t0: tL, t1: 99, type: 'spot', u: null });
      kickTeam.filter(a => a !== k0).forEach(a => K(a, tL, a.u0 + 18, a.d0));
      recv.forEach(a => K(a, tL + .3, Math.max(res.land + 3, a.u0 - 8), lerp(a.d0, clamp(res.landD, .05, .95), .35)));
      P.T = tL + .5; return finishPlan(P);
    }
    K(kr, tL - .3, res.land, res.landD);
    B({ t0: tK, t1: tL, type: 'fly', from: [0, .5, 3], toA: kr, h1: 30, arc: 230 });
    return planReturn(P, kr, tL, res, kickTeam.filter(a => a !== k0), recv.filter(a => a !== kr), tK);
  }
  if (res.kind === 'punt') {
    const p = by('P'), kr = by('KR'), tP = SNAP + .4, tK = SNAP + 1.15;
    B({ t0: 0, t1: SNAP, type: 'spot', u: 0, d: .5, h: 4 });
    B({ t0: SNAP, t1: tP, type: 'fly', from: [0, .5, 4], toA: p, h1: 30, arc: 4 });
    B({ t0: tP, t1: tK, type: 'hold', a: p });
    K(p, tK, -12.5, .5);
    A.filter(a => a.line && a.side === 'off').forEach(a => K(a, SNAP + .7, a.u0 - 1.2, a.d0));
    const rushers = A.filter(a => a.role === 'DL');
    rushers.forEach(a => K(a, tK, res.out === 'blocked' ? -3 : -0.4, lerp(a.d0, .5, .2)));
    if (res.out === 'blocked') {
      const blk = rushers.reduce((m, x) => Math.abs(x.d0 - .5) < Math.abs(m.d0 - .5) ? x : m);
      cutAt(blk, SNAP + .3); K(blk, tK, -11.5, .5);
      const tB = tK + .7;
      B({ t0: tK, t1: tB, type: 'fly', from: [-12.5, .5, 30], to: [res.endU, res.landD, 0], arc: 25 });
      B({ t0: tB, t1: 99, type: 'spot', u: null });
      const rec = nearAt(recv.filter(a => a !== blk), tK, res.endU, res.landD);
      cutAt(rec, tK); K(rec, tB + .5, res.endU, res.landD); rec.fallAt = tB + .5;
      A.filter(a => a !== rec && a !== blk).forEach(a => { const q = cutAt(a, tK); K(a, tB + .6, lerp(q[0], res.endU, .5), lerp(q[1], res.landD, .4)); });
      P.T = tB + .9; return finishPlan(P);
    }
    const hang = res.out === 'shank' ? 1.2 : 2.3, tL = tK + hang;
    const cover = kickTeam.filter(a => a !== p && a.role !== 'PP');
    if (res.out === 'shank' || res.out === 'touchback' || res.out === 'downed') {
      const to = [res.land, res.landD, 0];
      B({ t0: tK, t1: tL, type: 'fly', from: [-12.5, .5, 30], to, arc: res.out === 'shank' ? 90 : 210 });
      B({ t0: tL, t1: 99, type: 'spot', u: null });
      const gun = A.filter(a => a.role === 'GU');
      gun.forEach((g, i) => { K(g, tL, Math.min(res.land - 2 + i * 2, toGoal - 1), lerp(g.d0, res.landD, .7)); if (res.out === 'downed' && i === 0) K(g, tL + .5, Math.min(res.land, toGoal - 1), res.landD); });
      cover.filter(a => !gun.includes(a)).forEach(a => K(a, tL + .4, Math.min(a.u0 + 20, res.land - 4), lerp(a.d0, res.landD, .3)));
      K(kr, tL, Math.min(res.land - 2, kr.u0), lerp(kr.d0, res.landD, .5));
      recv.filter(a => a !== kr).forEach(a => K(a, tL, a.u0 + 6, a.d0));
      P.T = tL + .7; return finishPlan(P);
    }
    K(kr, tL - .3, res.land, res.landD);
    B({ t0: tK, t1: tL, type: 'fly', from: [-12.5, .5, 30], toA: kr, h1: 30, arc: 210 });
    return planReturn(P, kr, tL, res, cover, recv.filter(a => a !== kr && a.role !== 'DL'), tK);
  }
  // field goal / extra point
  const h = by('H'), k0 = by('K'), tH = SNAP + .35, tK = SNAP + .95;
  B({ t0: 0, t1: SNAP, type: 'spot', u: 0, d: .5, h: 4 });
  A.filter(a => a.line && a.side === 'off').forEach(a => K(a, SNAP + .5, a.u0 - .8, a.d0));
  A.filter(a => a.role === 'DL').forEach(a => K(a, SNAP + .6, .2, a.d0));
  A.filter(a => a.role === 'S').forEach(a => K(a, tK + .3, a.u0 - 4, lerp(a.d0, .5, .5)));
  if (res.miss === 'Bad snap') {
    B({ t0: SNAP, t1: tH + .1, type: 'fly', from: [0, .5, 4], to: [-8.6, .6, 0], arc: 30 });
    B({ t0: tH + .1, t1: 99, type: 'spot', u: null });
    K(h, tH + .6, -8.4, .59); h.fallAt = tH + .6;
    A.filter(a => a.role === 'DL').forEach(a => K(a, tH + 1.1, -2.5, lerp(a.d0, .55, .3)));
    P.T = tH + 1.4; return finishPlan(P);
  }
  B({ t0: SNAP, t1: tH, type: 'fly', from: [0, .5, 4], to: [-7, .5, 8], arc: 3 });
  B({ t0: tH, t1: tK, type: 'spot', u: -7, d: .5, h: 8 });
  K(k0, tH, -9.5, .56); K(k0, tK, -7.4, .52); K(k0, tK + .3, -5.8, .5);
  const posts = toGoal + 10, from = [-7, .5, 8], fly = (toGoal + 17) / 30 + .55, tE = tK + fly;
  if (res.miss === 'Short') {
    B({ t0: tK, t1: tE, type: 'fly', from, to: [toGoal + rnd(1, 5), .5 + rnd(-.04, .04), 0], arc: 150 });
    B({ t0: tE, t1: 99, type: 'spot', u: null });
  } else {
    const d = res.good ? .5 + rnd(-.03, .03) : .5 + (res.miss === 'Wide left' ? 1 : -1) * dir() * rnd(.075, .11);
    const endU = posts + 4, fp = (posts + 7) / (endU + 7), h1 = 130, hp = res.good ? 150 : 140;
    const arc = (hp - lerp(8, h1, fp)) / (4 * fp * (1 - fp));
    B({ t0: tK, t1: tE, type: 'fly', from, to: [endU, d, h1], arc });
    B({ t0: tE, t1: tE + .4, type: 'fly', from: [endU, d, h1], to: [endU + 7, d, 0] });
    B({ t0: tE + .4, t1: 99, type: 'spot', u: endU + 7, d, h: 0 });
  }
  P.T = tE + .5;
  return finishPlan(P);
}
// Kickoff and punt returns: the returner catches the ball at tCatch, the coverage team closes in, and the
// return team blocks. Touchbacks, fair catches: he catches it and stops.
function planReturn(P, kr, tCatch, res, cover, blockers, tGo) {
  const B = sg => P.ball.push(sg), toGoal = ytg();
  B({ t0: tCatch, t1: 99, type: 'hold', a: kr });
  const land = [res.land, res.landD];
  const runTo = (a, t, u, d) => { const p = evalKeys(a.keys, tGo), dist = Math.hypot(u - p[0], (d - p[1]) * 53); K(a, Math.max(t, tGo + dist / 8.5), u, d); };
  // coverage arrives near the catch
  cover.forEach((a, i) => runTo(a, tCatch + .2, Math.min(land[0] - 6 - (i % 4) * 3, toGoal - 2), clamp(lerp(a.d0, land[1], .55), .04, .96)));
  blockers.forEach((a, i) => runTo(a, tCatch + .1, Math.min(land[0] - 4 - (i % 3) * 2, toGoal - 1), clamp(lerp(a.d0, land[1], .35), .04, .96)));
  if (res.out !== 'return') { P.T = tCatch + .9; return finishPlan(P); }
  const end = [res.endU, clamp(land[1] + rnd(-.2, .2), .08, .92)];
  const T = tCatch + .25 + Math.hypot(res.catchU - res.endU, (end[1] - land[1]) * 53) / (res.ret > 25 ? 8.8 : 7.8);
  K(kr, tCatch + .25, res.catchU, land[1]); K(kr, T, end[0], end[1]);
  P.T = T;
  if (!res.td) {
    const tk = nearAt(cover, tCatch + .2, end[0], end[1]);
    K(tk, T, end[0] - .8, end[1] + .01); tk.fallAt = T; kr.fallAt = T; P.tackler = tk;
  }
  cover.filter(a => a !== P.tackler).forEach((a, i) => { const p = evalKeys(a.keys, tCatch + .2), ang = i * 2.4, rad = res.td ? 4 + i % 4 : 1.8 + (i % 3); K(a, T, lerp(p[0], end[0] - 2 + Math.cos(ang) * rad, .85), clamp(lerp(p[1], end[1] + Math.sin(ang) * rad / 53, .85), .03, .97)); });
  blockers.forEach((a, i) => { const p = evalKeys(a.keys, tCatch + .1); K(a, T, lerp(p[0], end[0] + 2 + (i % 3), .6), clamp(lerp(p[1], end[1], .4), .03, .97)); });
  if (res.fumble) P.fumble = true;
  return finishPlan(P);
}

// ---------- goal posts ----------
function drawGoalPosts() {
  for (const x of [-10, 110]) {
    const [bx, by] = proj(x, .5); if (bx < -80 || bx > 1360) continue;
    const sc = 0.7 + 0.5 * .5, cb = 90 * sc, up = 240 * sc;
    const [lx, ly] = proj(x, .5 - .058), [rx, ry] = proj(x, .5 + .058);
    ctx.strokeStyle = '#FACC15'; ctx.lineCap = 'round';
    ctx.lineWidth = 6 * sc; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - cb); ctx.stroke();
    ctx.lineWidth = 4 * sc; ctx.beginPath(); ctx.moveTo(lx, ly - cb); ctx.lineTo(rx, ry - cb); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lx, ly - cb); ctx.lineTo(lx, ly - up); ctx.moveTo(rx, ry - cb); ctx.lineTo(rx, ry - up); ctx.stroke();
    ctx.lineCap = 'butt';
  }
}
