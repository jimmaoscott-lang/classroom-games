// Huddle Up: formations, result math, and play animations.
// Animations work in the offense's frame: u = yards downfield from the line of scrimmage, d = across the field (0-1).

// ---------- formation ----------
function setFormation() {
  const L = G.ballX, s = dir(), O = G.poss, D = other(O), A = [];
  const add = (team, side, role, num, u, d) => A.push({ team, side, role, num, u0: u, d0: d, u, d, x: L + s * u, face: side === 'off' ? s : -s, line: ['OL', 'TE', 'DL'].includes(role), run: 0, moving: false, fall: 0, ball: false, keys: null, fallAt: null });
  const on = NUMS[O].off, dn = NUMS[D].def;
  [.38, .44, .50, .56, .62].forEach((d, i) => add(O, 'off', i === 2 ? 'C' : 'OL', on.OL[i], -1, d));
  add(O, 'off', 'TE', on.TE[0], -1, .69);
  add(O, 'off', 'WR', on.WR[0], -1, .10); add(O, 'off', 'WR', on.WR[1], -1, .90); add(O, 'off', 'WR', on.WR[2], -2, .22);
  add(O, 'off', 'QB', on.QB[0], -3, .50);
  add(O, 'off', 'RB', on.RB[0], -7, .50);
  const call = G.defCall || 'Zone';
  const lbU = call === 'Stack the Box' ? 3.8 : call === 'Blitz' ? 2.6 : 5;
  const sU = call === 'Stack the Box' ? 7 : 11, cbU = call === 'Man Coverage' ? 1.6 : 3.5;
  [.41, .47, .53, .59].forEach((d, i) => add(D, 'def', 'DL', dn.DL[i], 1.6, d));
  [.35, .50, .65].forEach((d, i) => add(D, 'def', 'LB', dn.LB[i], lbU, d));
  add(D, 'def', 'CB', dn.CB[0], cbU, .10); add(D, 'def', 'CB', dn.CB[1], cbU, .90);
  const sd = call === 'Stack the Box' ? [.40, .60] : [.30, .70];
  add(D, 'def', 'S', dn.S[0], sU, sd[0]); add(D, 'def', 'S', dn.S[1], sU, sd[1]);
  G.actors = A;
  G.ball = { x: L, d: .5, h: 4, carrier: null };
}
const role = r => G.actors.filter(a => a.role === r);
const offense = () => G.actors.filter(a => a.side === 'off');
const defense = () => G.actors.filter(a => a.side === 'def');

// ---------- result math (matchup ~40%, huddle ~35%, ratings ~15%, luck ~10%) ----------
// oq: offense huddle 'clean' | 'shaky'. dq: defense huddle 'clean' | 'shaky' | 'blown'.
// mods: on-field first-miss effects (slowSnap hurts the offense, slowRead hurts the defense).
function huddleTerm(oq, dq) { return clamp((oq === 'clean' ? 0.6 : -0.4) + (dq === 'clean' ? -0.3 : dq === 'shaky' ? 0.4 : 0.9), -1, 1); }
function ratingTerm(call, O, D) {
  const [op, dp] = RATINGS_USED[call];
  const avg = (team, ps) => ps.reduce((sum, p) => sum + effRating(team, p), 0) / ps.length;
  return clamp((avg(O, op) - avg(D, dp)) / 10, -1, 1);
}
function effRating(team, p) { const r = G.ratings[team][p]; return r.hurt > 0 ? r.start : r.now; }
function resolvePlay(call, defCall, oq, dq, mods) {
  mods = mods || {};
  const O = G.poss, D = other(O), toGoal = ytg(), own = 100 - toGoal;
  const mk = MATCHUP[call][defCall], risky = mk === 'R';
  const m = mk === 'G' ? 1 : mk === 'B' ? -1 : 0;
  let T = 0.40 * m + 0.35 * huddleTerm(oq, dq) + 0.15 * ratingTerm(call, O, D) + 0.10 * rnd(-1, 1);
  if (mods.slowSnap) T -= 0.25;
  if (mods.slowRead) T += 0.25;
  const big = dq === 'blown' ? 0.25 : 0;
  const res = { call, defCall, oq, dq, T, kind: 'run', yds: 0 };
  const yac = () => Math.max(0, Math.round(1.5 + T * 4 + gauss() * 2.5)) + (Math.random() < 0.04 + 0.12 * Math.max(T, 0) + big ? irnd(10, 35) : 0);
  if (call === 'Run Inside' || call === 'Run Outside') {
    const outside = call === 'Run Outside';
    let y = outside ? Math.round(2.5 + T * 6 + gauss() * 3.2) : Math.round(2.5 + T * 5 + gauss() * 2);
    if (T > 0.1 && Math.random() < 0.02 + 0.08 * T + big) y += irnd(10, 35);
    res.yds = Math.max(y, outside ? -6 : -4);
    if (Math.random() < 0.012 + (T < -0.4 ? 0.025 : 0)) res.fumble = true;
  } else {
    const P = {
      'Short Pass':  { sack: .04 - .06 * T + (defCall === 'Blitz' ? .04 : 0), int: .03 - .05 * T, comp: .62 + .33 * T, air: [3, 8] },
      'Deep Pass':   { sack: .06 - .08 * T + (risky ? .12 : 0), int: .06 - .08 * T, comp: .38 + .40 * T + (risky ? .10 : 0) + big, air: [16, 34] },
      'Play Action': { sack: .05 - .07 * T, int: .04 - .06 * T, comp: .55 + .33 * T, air: [8, 18] },
    }[call];
    const r = Math.random();
    const sackP = clamp(P.sack, .01, .30), intP = clamp(P.int, .005, .18), compP = clamp(P.comp, .12, .92);
    res.air = irnd(P.air[0], P.air[1]);
    if (r < sackP) { res.kind = 'sack'; res.yds = -irnd(4, 8); }
    else if (r < sackP + intP) { res.kind = 'int'; res.ret = irnd(0, 18) + (Math.random() < 0.08 ? irnd(20, 60) : 0); }
    else if (r < sackP + intP + (1 - sackP - intP) * compP) {
      res.kind = 'complete'; res.yds = res.air + (call === 'Deep Pass' ? Math.max(0, Math.round(T * 3 + gauss() * 3)) + (Math.random() < big + 0.1 * Math.max(T, 0) ? irnd(5, 25) : 0) : yac());
      if (Math.random() < 0.01) res.fumble = true;
    }
    else res.kind = 'incomplete';
  }
  // field edges: touchdowns, safeties, interceptions in the end zone
  if (res.kind === 'int') {
    res.air = Math.min(res.air, toGoal + 6);
    res.spot = res.air - res.ret; // offense frame
    if (res.air >= toGoal && res.ret < 6) { res.touchback = true; res.spot = toGoal; res.ret = 0; }
    if (res.spot <= -own) { res.pick6 = true; res.spot = -own - 3; }
  } else if (res.kind !== 'incomplete') {
    if (res.kind === 'complete' && res.air > toGoal) res.air = Math.min(toGoal + irnd(1, 5), toGoal + 8);
    if (res.yds >= toGoal && !res.fumble) { res.td = true; res.yds = toGoal; }
    else if (res.yds >= toGoal) res.yds = toGoal - 1;
    if (res.yds <= -own) { res.safety = true; res.yds = -own - 1; res.fumble = false; }
  }
  return res;
}

// ---------- play animation planning ----------
const SNAP = 0.35;
function K(a, t, u, d) { (a.keys = a.keys || []).push([t, u, d]); }
function evalKeys(k, t) {
  if (t <= k[0][0]) return [k[0][1], k[0][2]];
  for (let i = 1; i < k.length; i++) if (t <= k[i][0]) { const p = k[i - 1], q = k[i], f = (t - p[0]) / Math.max(1e-6, q[0] - p[0]); return [lerp(p[1], q[1], f), lerp(p[2], q[2], f)]; }
  const l = k[k.length - 1]; return [l[1], l[2]];
}
function cutAt(a, t) { const p = evalKeys(a.keys, t); a.keys = a.keys.filter(k => k[0] < t); a.keys.push([t, p[0], p[1]]); return p; }
const nearAt = (list, t, u, d) => list.reduce((m, x) => { const p = evalKeys(x.keys, t), q = evalKeys(m.keys, t); return Math.hypot(p[0] - u, (p[1] - d) * 53) < Math.hypot(q[0] - u, (q[1] - d) * 53) ? x : m; });

function planPlay(res) {
  const A = G.actors; A.forEach(a => { a.keys = [[0, a.u0, a.d0]]; a.fallAt = null; a.ball = false; a.fall = 0; });
  const qb = role('QB')[0], rb = role('RB')[0], c = role('C')[0], wrs = role('WR');
  const call = res.call, dc = res.defCall, isRun = call.startsWith('Run'), toGoal = ytg();
  const P = { ball: [], T: 0, res };
  const ballSeg = (s) => P.ball.push(s);
  ballSeg({ t0: 0, t1: SNAP, type: 'spot', u: 0, d: .5, h: 4 });
  const push = isRun ? clamp(0.2 + res.T * 1.6, -0.8, 1.6) : 0;
  // --- blockers and pass rush ---
  for (const a of A) {
    if (['OL', 'C', 'TE'].includes(a.role)) {
      if (isRun) K(a, SNAP + .6, a.u0 + push, a.d0 + (call === 'Run Outside' ? .02 : 0));
      else K(a, SNAP + .5, a.u0 - 1.1, a.d0 + (a.d0 - .5) * .1);
    }
    if (a.role === 'DL') {
      if (isRun) K(a, SNAP + .6, a.u0 + push - 0.8, a.d0);
      else { K(a, SNAP + .5, -0.6, a.d0); K(a, SNAP + 2.6, -1.8, lerp(a.d0, .5, .3)); }
    }
  }
  // --- QB, RB, receivers, coverage ---
  let carrier, tC, end, tackleFrom = null;
  const passDrop = { 'Short Pass': [3.3, .55, .25], 'Deep Pass': [7, .95, .5], 'Play Action': [6, 1.25, .45] }[call];
  // receivers' default routes (non-targets)
  wrs.forEach((w, i) => { const deep = call === 'Deep Pass' ? rnd(14, 20) : rnd(6, 12); K(w, SNAP + deep / 7.5, w.u0 + deep, clamp(w.d0 + (w.d0 < .5 ? 1 : -1) * rnd(.02, .14), .05, .95)); });
  // defense phase 1 by call
  for (const a of defense()) {
    if (a.role === 'LB') {
      if (dc === 'Blitz' && !isRun) K(a, SNAP + 1.0, -3.5, lerp(a.d0, .5, .6));
      else if (dc === 'Zone') K(a, SNAP + 1.0, a.u0 + 4, a.d0);
      else K(a, SNAP + 1.0, a.u0 + 1.5, a.d0);
    }
    if (a.role === 'CB') {
      const w = a.d0 < .5 ? wrs[0] : wrs[1];
      if (dc === 'Man Coverage' || dc === 'Blitz') w.keys.slice(1).forEach(k => K(a, k[0] + .1, k[1] + 1.1, k[2] + (k[2] < .5 ? .02 : -.02)));
      else K(a, SNAP + 1.6, a.u0 + 6, a.d0 + (a.d0 < .5 ? .08 : -.08));
    }
    if (a.role === 'S') { if (dc === 'Stack the Box' && isRun) K(a, SNAP + 1, a.u0 - 3, lerp(a.d0, .5, .5)); else K(a, SNAP + 1.6, a.u0 + 5, a.d0); }
  }
  if (isRun) {
    // QB hands off (inside) or pitches (outside); RB carries
    carrier = rb;
    if (call === 'Run Inside') {
      K(qb, SNAP + .45, -3.6, .52); K(qb, SNAP + 1.1, -5, .45);
      tC = .85;
      K(rb, SNAP, -7, .5); K(rb, tC, -3.4, .5);
      ballSeg({ t0: SNAP, t1: SNAP + .15, type: 'fly', from: [0, .5, 4], toA: qb, h1: 30 });
      ballSeg({ t0: SNAP + .15, t1: tC, type: 'hold', a: qb });
      const gapD = pick([.47, .53]), endD = clamp(gapD + rnd(-.08, .08) + (res.yds > 12 ? rnd(-.15, .15) : 0), .08, .92);
      end = [res.yds + (res.td ? 3 : 0), endD];
      if (end[0] > 0.3) { const t2 = tC + Math.hypot(3.7, (gapD - .5) * 53) / 7; K(rb, t2, 0.3, gapD); K(rb, t2 + Math.hypot(end[0] - .3, (endD - gapD) * 53) / (res.yds > 12 ? 8.5 : 7.5), end[0], endD); }
      else K(rb, tC + Math.max(.35, (end[0] + 3.4) / 6), end[0], gapD);
    } else {
      const side = pick([.18, .82]), pd = side > .5 ? .56 : .44;
      K(qb, SNAP + .25, -3.2, .5); K(qb, SNAP + 1.0, -4, .5);
      tC = SNAP + .6;
      K(rb, SNAP, -7, .5); K(rb, tC, -6.2, pd);
      ballSeg({ t0: SNAP, t1: SNAP + .15, type: 'fly', from: [0, .5, 4], toA: qb, h1: 30 });
      ballSeg({ t0: SNAP + .15, t1: SNAP + .3, type: 'hold', a: qb });
      ballSeg({ t0: SNAP + .3, t1: tC, type: 'fly', fromA: qb, toA: rb, h0: 30, h1: 30, arc: 10 });
      const endD = clamp(side + rnd(-.06, .06) + (side > .5 ? -1 : 1) * (res.yds > 12 ? rnd(0, .2) : 0), .05, .95);
      end = [res.yds + (res.td ? 3 : 0), endD];
      const t2 = tC + Math.hypot(4.5, (side - pd) * 53) / 8;
      if (end[0] > -1.5) { K(rb, t2, -1.5, side); K(rb, t2 + Math.hypot(end[0] + 1.5, (endD - side) * 53) / 8, end[0], endD); }
      else K(rb, t2 + .2, end[0], lerp(pd, side, .7));
    }
  } else {
    const [depth, dropT, holdT] = passDrop;
    if (call === 'Play Action') { K(qb, SNAP + .45, -3.6, .52); K(rb, SNAP + .6, -3.4, .5); K(rb, SNAP + 1.2, -0.5, .53); }
    else K(rb, SNAP + .5, -4.5, .56);
    K(qb, SNAP + dropT, -depth, .5);
    ballSeg({ t0: SNAP, t1: SNAP + .15, type: 'fly', from: [0, .5, 4], toA: qb, h1: 30 });
    if (res.kind === 'sack') {
      const tS = SNAP + dropT + rnd(.2, .6);
      K(qb, tS, res.yds, .5 + rnd(-.03, .03));
      const pool = dc === 'Blitz' ? role('LB').concat(role('DL')) : role('DL');
      const sacker = pool.reduce((m, x) => Math.abs(x.d0 - .5) < Math.abs(m.d0 - .5) ? x : m);
      cutAt(sacker, SNAP + .5); K(sacker, tS, res.yds + 0.8, .5);
      carrier = qb; tC = SNAP + .15; end = [res.yds, .5];
      ballSeg({ t0: SNAP + .15, t1: 99, type: 'hold', a: qb });
      P.T = tS; P.tackler = sacker;
      qb.fallAt = tS; sacker.fallAt = tS;
      defense().filter(x => x !== sacker).forEach(x => { const p = cutAt(x, Math.min(tS, SNAP + .8)); K(x, tS + .3, lerp(p[0], res.yds + 2, .3), lerp(p[1], .5, .25)); });
      return finishPlan(P);
    }
    const tThrow = SNAP + dropT + holdT;
    ballSeg({ t0: SNAP + .15, t1: tThrow, type: 'hold', a: qb });
    passRush(qb, depth, tThrow, res.kind === 'incomplete');
    // target receiver and catch point
    const target = call === 'Short Pass' ? pick([wrs[2], wrs[0], wrs[1]]) : pick([wrs[0], wrs[1]]);
    const air = res.air;
    const cd = clamp(target.d0 + (target.d0 < .5 ? 1 : -1) * rnd(.02, .14), .06, .94);
    const qbAt = [-depth, .5], dist = Math.hypot(air + depth, (cd - .5) * 53);
    tC = tThrow + .25 + dist / 24;
    target.keys = [[0, target.u0, target.d0], [SNAP, target.u0, target.d0], [lerp(SNAP, tC, .5), air * .55, lerp(target.d0, cd, .25)], [tC, air, cd]];
    // coverage defender stays with the target
    const cover = nearAt(role('CB').concat(role('S')), tC, air, cd);
    cutAt(cover, SNAP + .3); K(cover, tC, air + (res.kind === 'int' ? 0.2 : res.kind === 'incomplete' ? 0.9 : 1.6), cd + (res.kind === 'incomplete' ? .015 : .03));
    if (res.kind === 'incomplete') {
      ballSeg({ t0: tThrow, t1: tC + .1, type: 'fly', fromA: qb, to: [air + rnd(1, 3), cd + rnd(-.04, .04), 0], h0: 34, arc: 8 + dist * .9 });
      ballSeg({ t0: tC + .1, t1: 99, type: 'spot', u: null });
      K(target, tC + .5, air + 2, cd);
      P.T = tC + .5; P.incomplete = true;
      return finishPlan(P);
    }
    if (res.kind === 'int') {
      carrier = cover;
      ballSeg({ t0: tThrow, t1: tC, type: 'fly', fromA: qb, toA: cover, h0: 34, h1: 30, arc: 8 + dist * .9 });
      ballSeg({ t0: tC, t1: 99, type: 'hold', a: cover });
      end = [res.spot, clamp(cd + rnd(-.1, .1), .05, .95)];
      K(cover, tC + Math.max(.3, Math.abs(air - end[0]) / 7.5), end[0], end[1]);
      P.T = evalLast(cover);
      if (!res.pick6 && !res.touchback) { const tk = target; cutAt(tk, tC); K(tk, P.T, end[0] - 0.8, end[1]); P.tackler = tk; tk.fallAt = P.T; cover.fallAt = P.T; }
      offense().filter(x => x !== target && x.role !== 'OL' && x.role !== 'C').forEach(x => { const p = cutAt(x, tC); K(x, P.T, lerp(p[0], end[0], .5), lerp(p[1], end[1], .5)); });
      defense().filter(x => x !== cover).forEach(x => { const p = cutAt(x, tC); K(x, P.T, lerp(p[0], end[0], .35), lerp(p[1], end[1], .3)); });
      return finishPlan(P);
    }
    carrier = target;
    ballSeg({ t0: tThrow, t1: tC, type: 'fly', fromA: qb, toA: target, h0: 34, h1: 30, arc: 8 + dist * .9 });
    end = [res.yds + (res.td ? 3 : 0), clamp(cd + rnd(-.08, .08) * (res.yds - air > 8 ? 2 : 1), .05, .95)];
    K(target, tC + Math.max(.25, Math.hypot(end[0] - air, (end[1] - cd) * 53) / 8), end[0], end[1]);
    tackleFrom = cover;
  }
  // --- ball carrier is set: hold, tackle, pursuit ---
  if (isRun) ballSeg({ t0: tC, t1: 99, type: 'hold', a: rb });
  else ballSeg({ t0: tC, t1: 99, type: 'hold', a: carrier });
  P.T = evalLast(carrier);
  const T = P.T;
  // tackler
  if (!res.td) {
    let pool = res.yds <= 0 ? role('DL').concat(role('LB')) : res.yds <= 7 ? role('LB').concat(tackleFrom ? [tackleFrom] : []) : role('S').concat(role('CB'));
    const tk = tackleFrom && res.yds - res.air < 3 ? tackleFrom : nearAt(pool, tC, end[0], end[1]);
    cutAt(tk, Math.min(tC, T - .2)); K(tk, T, end[0] + 0.8, end[1] + .01);
    P.tackler = tk; tk.fallAt = T; carrier.fallAt = T;
  }
  // everyone else on defense pursues; a few blockers follow the play
  defense().filter(x => x !== P.tackler).forEach((x, i) => {
    const p = cutAt(x, Math.min(tC + (x.role === 'DL' && isRun ? .4 : 0), T));
    const ang = i * 2.4, rad = res.td ? 3 + (i % 4) : 1.6 + (i % 3) * 0.9;
    const k = x.role === 'DL' ? 0.6 : x.role === 'CB' ? 0.75 : 0.9;
    const tu = end[0] + Math.cos(ang) * rad + (res.td ? -4 : 1), td = clamp(end[1] + Math.sin(ang) * rad / 53, .03, .97);
    K(x, T, lerp(p[0], tu, k), lerp(p[1], td, k));
  });
  wrs.filter(w => w !== carrier).forEach(w => { const p = cutAt(w, Math.min(tC + .3, T)); K(w, T, lerp(p[0], end[0], .3), lerp(p[1], end[1], .3)); });
  if (res.fumble) P.fumble = true;
  return finishPlan(P);
}
// Pass rush on passes that are not sacks: the D-Line gets into the pocket and chases the QB.
// How close they get depends on D-Line vs O-Line ratings (a 100 D-Line is right on him as he throws).
function passPressure() {
  const O = G.poss, D = other(O);
  return clamp(0.35 + (effRating(D, 'D-Line') - effRating(O, 'O-Line')) / 30, 0.1, 0.95);
}
function passRush(qb, depth, tThrow, incomplete) {
  const p = passPressure();
  const dl = role('DL').slice().sort((a, b) => Math.abs(a.d0 - .5) - Math.abs(b.d0 - .5));
  dl.forEach((a, i) => {
    cutAt(a, SNAP + .5);
    const inside = i < 2, gap = lerp(inside ? 3.2 : 4.5, inside ? 0.8 : 1.6, p);
    const dT = lerp(a.d0, .5 + (a.d0 - .5) * .35, 0.4 + 0.5 * p);
    K(a, tThrow, -depth + gap, dT);
    // keep chasing after the throw; the closest rusher gets to the QB on an incompletion
    K(a, tThrow + .45, -depth + (i === 0 && incomplete && p > .5 ? 0.7 : gap * lerp(.85, .4, p)), lerp(dT, .5, .5));
  });
}
function evalLast(a) { return a.keys[a.keys.length - 1][0]; }
function finishPlan(P) {
  G.actors.forEach(a => a.keys.sort((p, q) => p[0] - q[0]));
  P.T = Math.max(P.T, 1.2);
  return P;
}

// ---------- play animation playback ----------
function actorPos(a, t) { return evalKeys(a.keys, t); }
function pose(P, t) {
  const L = G.ballX, s = dir();
  for (const a of G.actors) {
    const [u, d] = actorPos(a, t);
    const x = L + s * u, moved = Math.hypot(x - a.x, (d - a.d) * 53);
    a.x = x; a.d = d; a.u = u;
    const blocking = a.line && t > SNAP && t < P.T;
    a.moving = (moved > 0.004 || blocking) && !(a.fallAt != null && t > a.fallAt);
    a.run += moved * 1.7 + (blocking ? 0.12 : 0);
    a.fall = a.fallAt != null ? ease((t - a.fallAt) / 0.35) : 0;
    a.ball = false;
  }
  const b = G.ball; b.carrier = null;
  const seg = P.ball.find(sg => t >= sg.t0 && t < sg.t1) || P.ball[P.ball.length - 1];
  const at = (a, tt) => { const [u, d] = actorPos(a, tt); return [u, d]; };
  if (P.fumble && t > P.T) {
    const c = P.ball.find(sg => sg.type === 'hold' && sg.t1 === 99).a, [cu, cd] = at(c, P.T), f = clamp((t - P.T) / .4, 0, 1);
    b.x = L + s * (cu + 1.5 * f); b.d = cd + .03 * f; b.h = 24 * (1 - f) + 10 * Math.sin(f * Math.PI);
  } else if (seg.type === 'hold') { seg.a.ball = true; b.carrier = seg.a; b.x = seg.a.x; b.d = seg.a.d; b.h = 30; }
  else if (seg.type === 'fly') {
    const f = clamp((t - seg.t0) / (seg.t1 - seg.t0), 0, 1);
    const from = seg.fromA ? at(seg.fromA, seg.t0) : seg.from, to = seg.toA ? at(seg.toA, seg.t1) : seg.to;
    const h0 = seg.fromA ? (seg.h0 || 30) : seg.from[2], h1 = seg.toA ? (seg.h1 || 30) : seg.to[2];
    b.x = L + s * lerp(from[0], to[0], f); b.d = lerp(from[1], to[1], f); b.h = lerp(h0, h1, f) + (seg.arc || 0) * 4 * f * (1 - f);
  } else if (seg.type === 'spot') {
    if (seg.u === null) { const prev = P.ball[P.ball.indexOf(seg) - 1]; b.x = L + s * prev.to[0]; b.d = prev.to[1]; b.h = 0; }
    else { b.x = L + s * seg.u; b.d = seg.d; b.h = seg.h; }
  }
}
