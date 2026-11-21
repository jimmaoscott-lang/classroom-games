// Huddle Up: game flow (build step 8). Solo: Pelicans = the student coach, Comets = computer coach.
// Head-to-Head: G.me is this computer's team ('home' Pelicans or 'away' Comets), G.net is set (see net.js).

function newGame(opts) {
  opts = opts || {};
  const ratings = {};
  G = { net: opts.net || null };
  withSeed('ratings', () => { // Head-to-Head: both computers roll the same starting ratings
    for (const side of ['home', 'away']) {
      ratings[side] = {};
      for (const p of POS) { const v = irnd(60, 70); ratings[side][p] = { start: v, now: v, hurt: 0 }; }
    }
  });
  G = { me: opts.me || 'home', net: opts.net || null,
    score: { home: 0, away: 0 }, poss: 'away', ballX: 65, down: 1, toGo: 10, play: 0, seq: 0, pending: { kind: 'kickoff', kicker: 'away' }, points: 0, right: 0, wrong: 0,
    ratings, deck: [], camX: 33, mode: 'call', actors: [], ball: null, flag: null, halftimeDone: false,
    // Accommodations: Roster checkboxes (test link: the test options). Read aloud for everyone is a teacher setting.
    accom: { readAloud: $('#optRA').checked || READ_ALL, rosterRA: $('#optRA').checked, reduced: $('#optRC').checked, extended: $('#optET').checked },
    streak: 0, wrongRun: [], flags: 0, lockUntil: 0, log: [], cpuPoints: 0, injuries: 0, spent: 0,
    brk: { poss: 'home', score: 0 }, hist: { off: [], def: [] }, cpuStreak: 0, cpuInjuries: 0,
  };
  G.started = !!opts.play; G.defCall = null; setFormation();
  G.camX = camTarget(G.ballX, dir());
  updateHud(); showCalls();
}
const userOnOffense = () => G.poss === G.me;
const meN = () => TEAMS[G.me].short, opN = () => TEAMS[other(G.me)].short; // this coach's team, the other team
function changePoss(team, x) { G.poss = team; G.ballX = clamp(x, 1, 99); G.down = 1; G.toGo = Math.min(10, ytg()); }

// ---------- computer coach ----------
// The computer coach calls plays from the game situation, then leans toward calls that beat what the
// student has been calling lately. Difficulty only changes how often it misses its huddle questions.
const playsLeft = () => PLAYS_PER_GAME - G.play;
const lateGame = () => playsLeft() <= Math.max(4, PLAYS_PER_QUARTER / 2);
const cpuLead = () => G.score.away - G.score.home;
const VAL_D = { B: 1, E: 0, G: -1, R: 0.2 };  // how much a defense likes a matchup
const VAL_O = { G: 1, E: 0, B: -1, R: 0.3 };  // how much an offense likes a matchup
// Share of each call in the student's last 6 calls on that side (empty = no read yet).
function tendency(list) { const last = list.slice(-6), f = {}; last.forEach(c => f[c] = (f[c] || 0) + 1 / last.length); return f; }
function cpuOffense() {
  const long = G.down >= 2 && G.toGo >= 8, short = G.toGo <= 2, goal = ytg() <= 10, lead = cpuLead();
  const f = tendency(G.hist.def);
  return wpick(OFF_CALLS.map(c => {
    const run = c.startsWith('Run');
    let w = long ? (run ? 1 : 3) : short ? (run ? 4 : c === 'Play Action' ? 2 : 1) : 2;
    if (goal) w *= c === 'Deep Pass' ? 0.3 : run || c === 'Short Pass' ? 1.5 : 1;   // short field: no room to throw deep
    if (lateGame() && lead < 0) w *= run ? 0.5 : c === 'Deep Pass' ? 2 : 1.3;       // behind late: throw it
    if (lateGame() && lead > 0) w *= run ? 1.8 : c === 'Deep Pass' ? 0.4 : 0.8;     // ahead late: run it
    const read = Object.keys(f).reduce((n, d) => n + f[d] * VAL_O[MATCHUP[c][d]], 0);
    return [c, w * Math.exp(1.3 * read)];
  }));
}
function cpuDefense() {
  const long = G.down >= 2 && G.toGo >= 8, short = G.toGo <= 2, lead = cpuLead();
  const f = tendency(G.hist.off);
  return wpick(DEF_CALLS.map(d => {
    let w = long ? ({ 'Zone': 3, 'Man Coverage': 3, 'Blitz': 2, 'Stack the Box': 1 }[d]) : short ? ({ 'Stack the Box': 3, 'Blitz': 2, 'Zone': 1, 'Man Coverage': 1 }[d]) : 2;
    if (lateGame() && lead > 0) w *= d === 'Zone' ? 1.6 : d === 'Blitz' ? 0.6 : 1;      // ahead late: keep everything in front
    if (lateGame() && lead < 0) w *= d === 'Blitz' ? 1.6 : 1;                          // behind late: force a mistake
    const read = Object.keys(f).reduce((n, c) => n + f[c] * VAL_D[MATCHUP[c][d]], 0);
    return [d, w * Math.exp(1.3 * read)];
  }));
}
// 4th down: go for it on short yardage, deep in Pelicans territory, when behind late, or on the last play.
function cpuGoesForIt() {
  const lead = cpuLead();
  if (playsLeft() <= 1) return lead <= 0;
  if (lateGame() && lead < 0) return G.toGo <= 10 || playsLeft() <= 3;
  if (lateGame() && lead > 0) return G.toGo <= 1 && ytg() <= 40;
  return G.toGo <= 1 && ytg() <= 70 || (G.toGo <= 3 && ytg() <= 40);
}
// The computer team's huddle: same rules as the student. One question, a second chance after a miss.
// Returns 'clean', 'shaky' (missed once), 'delay' (offense missed twice) or 'blown' (defense missed twice).
function cpuHuddle(side) { // side: 'offense', 'defense', or a special teams phase (kickoff, return, punt, fg, pat)
  const notes = [];
  const miss = () => Math.random() < CPU_MISS;
  G.cpuMisses = G.cpuMisses || 0;
  if (!miss()) { G.cpuStreak = 0; return { q: 'clean', notes }; }
  G.cpuStreak++; G.cpuMisses++;
  // first miss: one random penalty (on-field effect or a rating loss for a player in the play)
  const players = phasePlayers(side);
  const canDrop = players.filter(p => G.ratings.away[p].now > G.ratings.away[p].start);
  if (canDrop.length && Math.random() < 0.5) {
    const p = pick(canDrop), r = G.ratings.away[p]; r.now = Math.max(r.start, r.now - 2); notes.push(`Comets ${p} lost 2 rating`);
  } else fieldEffect(side);
  let q = 'shaky';
  if (miss()) { G.cpuStreak++; G.cpuMisses++; q = side === 'offense' ? 'delay' : side === 'defense' ? 'blown' : 'bad'; }
  if (G.cpuStreak >= INJURY_STREAK) { G.cpuStreak = 0; notes.push(injurePlayer('away')); }
  return { q, notes };
}

// Players in the play and the on-field first-miss effect for each huddle phase.
function phasePlayers(phase) { return phase === 'offense' ? RATINGS_USED[G.offCall][0] : phase === 'defense' ? DEF_PLAYERS[G.defCall] : PHASE_PLAYERS[phase]; }
const FIELD_TEXT = { offense: 'slower snap and worse blocking on this play.', defense: 'confusion and a slower read on this play.', kickoff: 'a shorter kick.', punt: 'a shorter punt.', fg: 'a harder kick (less range).', pat: 'a harder kick.', return: 'the return blocking breaks down.' };
function fieldEffect(phase) {
  if (phase === 'offense') G.mods.slowSnap = true; else if (phase === 'defense') G.mods.slowRead = true;
  else if (phase === 'return') G.mods.badBlock = true; else G.mods.shortKick = true;
  return FIELD_TEXT[phase];
}
// Second miss on special teams: the full consequence for that phase.
const SECOND_MISS = { kickoff: 'The kick is shanked out of bounds.', return: 'Your return team is confused, so a fumble is more likely.', punt: 'Bad snap to the punter. The punt may be blocked or shanked.', fg: 'Bad snap! The kick will likely miss.', pat: 'Bad snap! The kick will likely miss.' };
// CPU field goal range: tries it when the make chance is about 45% or better.
const cpuFgOk = () => fgDistance() <= 48 + (effRating(G.poss, 'Kicker') - 65) * 0.3 + 3 && fgDistance() <= FG_MAX;

// Tell the student when the computer read a tendency ("keying on your Run Inside").
function keyingOn() {
  const userOff = userOnOffense(), list = userOff ? G.hist.off : G.hist.def, last = list.slice(-5);
  if (last.length < 4) return '';
  const top = Object.entries(tendency(last)).sort((a, b) => b[1] - a[1])[0];
  if (!top || top[1] < 0.6) return '';
  const beat = userOff ? MATCHUP[top[0]][G.defCall] === 'B' : MATCHUP[G.offCall][top[0]] === 'G';
  return beat ? `Comets coach is keying on your ${top[0]}. Mix it up!` : '';
}

// ---------- panel ----------
function showCalls() {
  G.mode = 'call'; hideBanner(); updateHud();
  if (G.pending) return showKick();
  const calls = $('#calls');
  if (userOnOffense()) {
    if (G.down === 4 && !G.goForIt) {
      $('#label').textContent = `Coach ${meN()} · 4th down · Your call`;
      const fd = fgDistance(), fgOn = fd <= FG_MAX;
      calls.innerHTML = `<button class="call" id="goFor">Go For It</button><button class="call" id="puntBtn">Punt</button><button class="call" id="fgBtn"${fgOn ? '' : ' disabled'}>Field Goal<small>${fgOn ? fd + ' yards' : 'Too far (' + fd + ' yards)'}</small></button>`;
      $('#hint').textContent = '';
      $('#goFor').onclick = () => fourthChoice('go');
      $('#puntBtn').onclick = () => fourthChoice('punt');
      $('#fgBtn').onclick = () => fourthChoice('fg');
      return;
    }
    $('#label').textContent = `Coach ${meN()} · Offense · Call the play`;
    calls.innerHTML = OFF_CALLS.map(c => `<button class="call" data-call="${c}">${c}</button>`).join('');
    $('#hint').textContent = '';
    $$('[data-call]').forEach(b => b.onclick = () => callOffense(b.dataset.call));
  } else {
    if (G.net && G.down === 4 && !G.goForIt) return waitFor('wait4', `4th down · Waiting for the ${opN()} coach to decide...`);
    if (!G.net && G.down === 4 && !cpuGoesForIt()) { G.pending = { kind: cpuFgOk() ? 'fg' : 'punt', kicker: G.poss }; return showKick(); }
    $('#label').textContent = `Coach ${meN()} · Defense · Call the defense` + (G.down === 4 ? ` · ${opN()} are going for it!` : '');
    calls.innerHTML = DEF_CALLS.map(c => `<button class="call" data-call="${c}">${c}</button>`).join('');
    $('#hint').textContent = '';
    $$('[data-call]').forEach(b => b.onclick = () => callDefense(b.dataset.call));
  }
}
// 4th down choice by the offense coach: go for it, punt, or field goal.
function fourthChoice(c) {
  if (G.net) sendFourth(c);
  if (c === 'go') { G.goForIt = true; return showCalls(); }
  G.pending = { kind: c, kicker: G.poss }; showCalls();
}
// ---------- special teams screen ----------
function showKick() {
  const P = G.pending, Kt = P.kicker, mine = Kt === G.me, kind = P.kind;
  G.poss = Kt; G.goForIt = false; G.mods = {}; G.userQ = null; G.cpuQ = null; G.cpuNotes = []; G.offCall = G.defCall = null;
  if (kind === 'kickoff') G.ballX = ownSpot(Kt, P.from || 35);
  if (kind === 'pat') G.ballX = ownSpot(other(Kt), 15);
  setKickFormation(kind); updateHud();
  const calls = $('#calls'), fd = fgDistance();
  const what = kind === 'fg' ? `${fd}-yard field goal` : KICK_NAMES[kind].toLowerCase();
  $('#hint').textContent = '';
  const one = (label, phase) => { calls.innerHTML = `<button class="call" data-kick="${phase}">${label}</button>`; $('[data-kick]').onclick = () => startKick(phase === 'watch' ? null : phase); };
  if (mine) {
    $('#label').textContent = `Coach ${meN()} · ${KICK_NAMES[kind]}${kind === 'fg' ? ' · ' + fd + ' yards' : ''}`;
    one({ kickoff: 'Kick off', punt: 'Punt it', fg: `Kick the field goal (${fd} yards)`, pat: 'Kick the extra point' }[kind], kind);
    $('#hint').textContent = 'Answer the huddle question for a clean kick.';
  } else if (kind === 'kickoff' || kind === 'punt') {
    $('#label').textContent = `Coach ${meN()} · ${kind === 'punt' ? 'Punt' : 'Kick'} return`;
    one(kind === 'punt' ? 'Return the punt' : 'Return the kick', 'return');
    $('#hint').textContent = 'Answer the huddle question so your blockers set up the return.';
  } else {
    if (G.net) return waitFor('wait', `${opN()} are lining up for the ${what}...`);
    $('#label').textContent = `${opN()} · ${what}`;
    one('Watch the kick', 'watch');
  }
}
function startKick(phase) {
  G.mods = {}; G.userQ = null; G.cpuQ = null; G.cpuNotes = [];
  const P = G.pending, two = P.kind === 'kickoff' || P.kind === 'punt';
  if (!G.net) { // the computer team's half of the kick
    const cpuPhase = phase === 'return' || phase === null ? P.kind : two ? 'return' : null;
    if (cpuPhase) { const h = cpuHuddle(cpuPhase); G.cpuQ = h.q; G.cpuNotes = h.notes; }
  }
  if (!phase) return kickGo();
  openHuddle(1, phase);
}
// Both halves are in (or the kicker's alone for field goals and extra points): kick it.
function kickGo() {
  closeHuddle();
  const P = G.pending, mine = P.kicker === G.me, two = P.kind === 'kickoff' || P.kind === 'punt';
  const kq = (mine ? G.userQ : G.cpuQ) || 'clean', rq = two ? ((mine ? G.cpuQ : G.userQ) || 'clean') : null;
  withSeed('kick' + G.seq, () => { G.res = resolveKick(P.kind, kq, rq, G.mods); setKickFormation(P.kind); G.plan = planKick(G.res); });
  G.mode = 'anim'; G.t0 = performance.now(); G.flag = null;
  $('#label').textContent = KICK_NAMES[P.kind]; $('#calls').innerHTML = ''; $('#hint').textContent = '';
}
function finishKick() {
  const r = G.res, P = G.pending, Kt = P.kicker, R = other(Kt), s = dir(), at = u => clamp(G.ballX + s * u, 1, 99);
  const kN = TEAMS[Kt].short, rN = TEAMS[R].short, mine = Kt === G.me;
  const counts = P.kind === 'punt' || P.kind === 'fg'; // 4th-down plays count toward the game length
  G.pending = null; G.lastKind = P.kind; G.seq++;
  let healed = '', big = '', cls = '';
  if (counts) { G.play++; G.goForIt = false; healed = tickInjuries(); }
  const small = [], good = c => c ? 'td' : 'flag'; // banner color from this coach's point of view
  if (P.kind === 'kickoff' || P.kind === 'punt') {
    const word = P.kind === 'kickoff' ? 'Kickoff' : 'Punt';
    if (r.out === 'touchback') { changePoss(R, ownSpot(R, P.kind === 'kickoff' ? 25 : 20)); big = 'Touchback'; }
    else if (r.out === 'oob') { changePoss(R, ownSpot(R, 40)); big = 'Kickoff out of bounds!'; cls = good(!mine); small.push(`${kN} missed their huddle twice · ${rN} get the ball at their 40`); }
    else if (r.out === 'shank') { changePoss(R, at(r.land)); big = `Shanked punt · ${r.land} yards`; cls = good(!mine); }
    else if (r.out === 'blocked') { changePoss(R, at(r.endU)); big = 'Punt blocked!'; cls = good(!mine); }
    else if (r.out === 'downed') { changePoss(R, at(r.land)); big = `${r.land}-yard punt · Downed`; cls = good(mine); }
    else if (r.out === 'fair') { changePoss(R, at(r.land)); big = `${r.land}-yard punt · Fair catch`; }
    else if (r.td) { G.score[R] += 6; big = `${word} return touchdown!`; cls = good(!mine); small.push(`${r.ret}-yard return by the ${rN}`); G.pending = { kind: 'pat', kicker: R }; }
    else if (r.fumble) { changePoss(Kt, at(r.endU)); big = `Fumble! ${kN} recover`; cls = good(mine); }
    else { changePoss(R, at(r.endU)); big = `${r.ret}-yard ${P.kind === 'punt' ? 'punt ' : ''}return`; if (r.ret >= 30) cls = good(!mine); }
    if (!r.td) small.push(`${TEAMS[G.poss].short} ball on ${spot(G.ballX)}`);
  } else if (P.kind === 'fg') {
    if (r.good) { G.score[Kt] += 3; big = `Field goal is good! ${r.dist} yards`; cls = good(mine); G.pending = { kind: 'kickoff', kicker: Kt }; }
    else {
      const lim = ownSpot(R, 20); changePoss(R, R === 'home' ? Math.max(G.ballX, lim) : Math.min(G.ballX, lim));
      big = `No good! ${r.miss}`; cls = good(!mine); small.push(`${r.dist} yards · ${rN} ball on ${spot(G.ballX)}`);
    }
  } else {
    if (r.good) { G.score[Kt] += 1; big = 'Extra point is good'; } else big = `Extra point no good · ${r.miss}`;
    cls = good(r.good === mine); G.pending = { kind: 'kickoff', kicker: Kt };
  }
  if (G.cpuQ === 'shaky') small.push(`${opN()} missed their huddle`);
  if (G.cpuQ === 'bad' && r.out !== 'oob') small.push(`${opN()} missed their huddle twice`);
  (G.cpuNotes || []).forEach(n => small.push(n));
  banner(big, small.join(' · ') + healed + (counts ? quarterNote() : ''), cls);
  G.mode = 'result'; G.resetCam = true; updateHud(); syncNote();
  $('#label').textContent = 'Result';
  showNext(nextLabel(), afterResult);
}
function showNext(text, fn) {
  $('#calls').innerHTML = `<button class="go" id="nextBtn">${text}</button>`;
  $('#hint').textContent = '';
  $('#nextBtn').onclick = fn;
}
function callOffense(call) {
  G.offCall = call; G.hist.off.push(call); G.mods = {}; G.userQ = null;
  if (G.net) { G.defCall = null; G.cpuQ = null; G.cpuNotes = []; } // the other coach's call stays secret until the snap
  else { G.defCall = cpuDefense(); const h = cpuHuddle('defense'); G.cpuQ = h.q; G.cpuNotes = h.notes; }
  openHuddle(1, 'offense');
}
function callDefense(call) {
  G.defCall = call; G.hist.def.push(call); G.mods = {}; G.userQ = null;
  if (G.net) { G.offCall = null; G.cpuQ = null; G.cpuNotes = []; }
  else { G.offCall = cpuOffense(); const h = cpuHuddle('offense'); G.cpuQ = h.q; G.cpuNotes = h.notes; }
  setFormation(); // show the defense lining up in its call
  openHuddle(1, 'defense');
}

// ---------- huddle ----------
function nextQuestion() {
  if (!G.deck.length) G.deck = shuffle(QUESTIONS.map((_, i) => i));
  const src = QUESTIONS[G.deck.pop()];
  const wrong = shuffle(src.w).slice(0, G.accom.reduced ? 2 : 3);
  return { src, choices: shuffle([{ text: src.a, right: true }].concat(wrong.map(w => ({ text: w, right: false })))) };
}
function openHuddle(attempt, side) {
  G.mode = 'huddle'; G.attempt = attempt; G.hSide = side || G.hSide; G.q = nextQuestion(); G.answered = false;
  $('#hTitle').textContent = HUDDLE_NAMES[G.hSide] + (G.hSide === 'offense' ? ' · ' + G.offCall : G.hSide === 'defense' ? ' · ' + G.defCall : G.hSide === 'fg' ? ' · ' + fgDistance() + ' yards' : '');
  $('#hTry').textContent = attempt === 1 ? '' : 'Second chance';
  $('#qText').textContent = G.q.src.q;
  $('#choices').innerHTML = G.q.choices.map((c, i) => `<button class="choice" data-i="${i}"><span class="let">${'ABCD'[i]}</span><span>${esc(c.text)}</span></button>`).join('');
  $$('.choice').forEach(b => b.onclick = () => answer(+b.dataset.i));
  $('#fb').textContent = ''; $('#fb').className = ''; $('#hNext').style.display = 'none';
  $('#hSpeak').style.display = G.accom.readAloud ? '' : 'none';
  $('#huddle').classList.add('show');
  G.clockStart = performance.now();
  if (G.accom.readAloud) { readQuestion(); G.clockStart += 1000 * questionWords() / 2.6; } // reading time starts after read-aloud
  G.clockLimit = PLAY_CLOCK ? PLAY_CLOCK * (G.accom.extended ? 2 : 1) : 0;                // play clock (teacher setting), doubled for extended time
  $('#hClock').style.display = 'none';
}
// Guessing check (Studio 68 rule): faster than 1 s + 0.25 s per word of question and choices.
const countWords = t => String(t).trim().split(/\s+/).filter(Boolean).length;
const questionWords = () => G.q.choices.reduce((n, c) => n + countWords(c.text), countWords(G.q.src.q));
const minReadSeconds = () => (1 + 0.25 * questionWords()) * (G.accom.extended ? EXTENDED_TIME : 1);
function accomText() { const a = []; if (G.accom.rosterRA) a.push('Read aloud'); if (G.accom.extended) a.push('Extended time'); if (G.accom.reduced) a.push('Reduced choices'); return a.join(', '); }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function readQuestion() { speak(G.q.src.q + '. ' + G.q.choices.map((c, i) => 'ABCD'[i] + '. ' + c.text).join('. ')); }
function speak(text) { try { if (!window.speechSynthesis) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = 0.95; speechSynthesis.speak(u); } catch (e) { } }
function stopSpeech() { try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) { } }

function answer(i) {
  if (G.answered || performance.now() < G.lockUntil) return; G.answered = true;
  const timeUp = i < 0; // play clock ran out
  const c = timeUp ? { text: '', right: false } : G.q.choices[i], off = G.hSide === 'offense', kick = KICK_PHASES.includes(G.hSide);
  const fast = !timeUp && (performance.now() - G.clockStart) / 1000 < minReadSeconds();
  // One log row per answer (sent to the Results tab of the class Sheet).
  const entry = { time: Date.now(), question: G.q.src.q, teks: G.q.src.teks || '', result: c.right ? 'Right' : 'Wrong', accom: accomText(), guess: false,
    event: HUDDLE_NAMES[G.hSide] + (G.attempt === 2 ? ' · second chance' : '') + (timeUp ? ' · play clock ran out' : '') + (G.net ? ' · Head-to-Head' : '') };
  G.log.push(entry); logAnswer(entry);
  $$('.choice').forEach((b, j) => { b.disabled = true; if (G.q.choices[j].right) b.classList.add('right'); });
  if (!c.right && !timeUp) $$('.choice')[i].classList.add('wrong');
  $('#hClock').style.display = 'none';
  const fb = $('#fb'), next = $('#hNext');
  let extra = '';
  if (c.right) {
    G.right++; G.streak = 0; G.wrongRun = [];
    const pts = G.attempt === 1 ? 2 : 1; G.points += pts; popPoints(pts);
    G.userQ = G.attempt === 1 ? 'clean' : 'shaky';
    fb.className = 'good';
    fb.textContent = G.attempt === 1 ? `Correct! Clean ${off || kick ? 'execution' : 'read by the defense'}. +2 skill points.` : 'Correct! Confusion cleared up. +1 skill point.';
    next.textContent = goText(); next.onclick = G.net ? sendReady : snap;
  } else {
    G.wrong++; G.streak++; G.wrongRun.push({ fast, pos: timeUp ? null : i, entry });
    fb.className = 'bad';
    if (G.attempt === 1) {
      fb.textContent = 'Not quite. Penalty: ' + firstMissPenalty(G.hSide) + ' Answer one more to clear it up.';
      next.textContent = 'Second chance question'; next.onclick = () => openHuddle(2);
    } else if (kick) { G.userQ = 'bad'; fb.textContent = 'Not quite. ' + SECOND_MISS[G.hSide]; next.textContent = goText(); next.onclick = G.net ? sendReady : snap; }
    else if (off) { G.userQ = 'delay'; fb.textContent = 'Not quite. Flag on the play: delay of game, 5 yards. Replay the down.'; next.textContent = 'Back to the line'; next.onclick = G.net ? sendReady : delayOfGame; }
    else { G.userQ = 'blown'; fb.textContent = 'Not quite. Missed assignment! Your defense is out of position, so a big play is more likely.'; next.textContent = goText(); next.onclick = G.net ? sendReady : snap; }
    if (G.streak >= INJURY_STREAK) { G.streak = 0; extra += ' ' + injurePlayer(G.me); }
    const g = checkGuessing(); if (g) extra += ' ' + g;
    fb.textContent += extra;
    if (timeUp) fb.textContent = fb.textContent.replace(/^Not quite\./, 'Play clock ran out.');
  }
  if (G.accom.readAloud) speak((c.right ? 'Correct. ' : (timeUp ? 'Time is up. ' : 'Not quite. ') + 'The correct answer is: ' + G.q.src.a + '. ') + fb.textContent.replace(/^(Correct!|Not quite\.|Play clock ran out\.)\s*/, ''));
  updateHud();
  next.style.display = 'block';
}
// Text on the button after the huddle.
function goText() {
  if (G.net) return G.hSide === 'return' ? 'Ready for the kick' : 'Ready to snap';
  return { kickoff: 'Kick off', return: 'Ready for the kick' }[G.hSide] || 'Snap the ball';
}
// 3 wrong answers in a row: a random player is shaken up and plays at his starting rating for 3 plays.
function injurePlayer(team) {
  team = team || G.me;
  const R = G.ratings[team], healthy = POS.filter(p => !R[p].hurt);
  const pool = healthy.filter(p => R[p].now > R[p].start);
  const p = pick(pool.length ? pool : healthy.length ? healthy : POS), r = R[p];
  r.hurt = INJURY_PLAYS;
  if (team !== G.me) { G.cpuInjuries++; return `${TEAMS[team].short} ${p} shaken up`; }
  G.injuries++;
  return `Three misses in a row: your ${p} is shaken up and plays at his starting rating (${r.start}) for the next ${INJURY_PLAYS} plays.`;
}
// Called once per play (snap, flag, or punt): count down shaken-up players on both teams.
function tickInjuries() {
  const back = [];
  for (const t of ['home', 'away']) for (const p of POS) { const r = G.ratings[t][p]; if (r.hurt > 0 && --r.hurt === 0) back.push((t !== G.me ? TEAMS[t].short + ' ' : '') + p); }
  return back.length ? ` · ${back.join(' and ')} back to full strength` : '';
}
// Guess flag: 3 wrong in a row that were each too fast to read, or 3 wrong in a row in the same position.
function checkGuessing() {
  const run = G.wrongRun; if (run.length < 3) return '';
  const last = run.slice(-3);
  if (!last.every(w => w.fast) && !(last[0].pos != null && last.every(w => w.pos === last[0].pos))) return '';
  last.forEach(w => w.entry.guess = true);
  G.wrongRun = []; G.flags++;
  const secs = G.flags === 1 ? 5 : 10;
  lockFor(secs, 'The ref is reviewing your answers. Slow down and read each question before you pick.');
  return 'Slow down and read each question.';
}
function lockFor(secs, msg) {
  G.lockUntil = performance.now() + secs * 1000;
  $('#lockMsg').textContent = msg; $('#lock').classList.add('on');
  if (G.accom.readAloud) setTimeout(() => speak(msg), 50);
  const tick = () => { const left = Math.ceil((G.lockUntil - performance.now()) / 1000); if (left <= 0 || !G.lockUntil) { $('#lock').classList.remove('on'); return; } $('#lockSecs').textContent = left; setTimeout(tick, 200); };
  tick();
}
// First miss: ONE random penalty from the options that can actually happen right now.
function firstMissPenalty(phase) {
  const players = phasePlayers(phase);
  const R = G.ratings[G.me], canDrop = players.filter(p => R[p].now > R[p].start);
  const opts = ['field'];
  if (canDrop.length) opts.push('rating');
  if (G.points > 0) opts.push('point');
  const o = pick(opts);
  if (o === 'field') return fieldEffect(phase);
  if (o === 'rating') { const p = pick(canDrop), r = R[p], was = r.now; r.now = Math.max(r.start, r.now - 2); return `${p} loses 2 rating points (${was} to ${r.now}).`; }
  G.points--; return 'the team loses 1 unspent skill point.';
}
function popPoints(n) {
  const p = $('#pop'); p.textContent = `+${n} skill point${n > 1 ? 's' : ''}!`; p.classList.remove('show'); void p.offsetWidth; p.classList.add('show');
  const c = $('#chip'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
}
function closeHuddle() { $('#huddle').classList.remove('show'); stopSpeech(); }

// ---------- plays ----------
const ownYards = () => 100 - ytg();
function delayOfGame() {
  closeHuddle();
  const who = userOnOffense() ? '' : opN() + ' ';
  const notes = G.cpuNotes && !userOnOffense() ? G.cpuNotes.map(n => ' · ' + n).join('') : '';
  const back = Math.min(5, Math.floor(ownYards()) / 2);
  const s = dir();
  G.ballX -= s * back; G.toGo += back; G.play++; G.seq++; G.lastKind = null;
  const healed = tickInjuries();
  G.flag = { x: G.ballX + s * (back - 1), d: .45 };
  G.defCall = null; setFormation();
  banner(`Flag · ${who}Delay of game`, `${userOnOffense() ? '' : opN() + ' missed their huddle twice · '}5-yard penalty · Replay ${ord(G.down)} down` + notes + healed + quarterNote(), userOnOffense() ? 'flag' : 'td');
  G.mode = 'result'; updateHud(); $('#label').textContent = 'Result'; syncNote();
  showNext(nextLabel(), afterResult);
}
function snap() {
  if (G.pending) return kickGo();
  closeHuddle();
  const oq = userOnOffense() ? G.userQ : G.cpuQ, dq = userOnOffense() ? G.cpuQ : G.userQ;
  if (oq === 'delay') return delayOfGame();
  // Head-to-Head: both computers use the same random numbers for this play, so both see the same result.
  withSeed('play' + G.seq, () => {
    G.res = resolvePlay(G.offCall, G.defCall, oq, dq, G.mods);
    setFormation();
    G.plan = planPlay(G.res);
  });
  G.mode = 'anim'; G.t0 = performance.now(); G.flag = null;
  $('#label').textContent = userOnOffense() ? `${G.offCall} vs ${G.defCall}` : `${G.defCall} vs ${opN()} ${G.offCall}`;
  $('#calls').innerHTML = ''; $('#hint').textContent = '';
}
function finishPlay() {
  const r = G.res, s = dir(), O = G.poss, D = other(O), userOff = O === G.me, dN = TEAMS[D].short, oN = TEAMS[O].short;
  G.play++; G.seq++; G.goForIt = false; G.lastKind = null;
  const healed = tickInjuries();
  let big = '', cls = '';
  const small = [];
  const gainTxt = y => y > 0 ? `${y} yard${y === 1 ? '' : 's'}` : y === 0 ? 'no gain' : `loss of ${-y}`;
  const good = userOff ? 'td' : 'flag', bad = userOff ? 'flag' : 'td'; // banner colors from this coach's point of view
  if (r.kind === 'int') {
    cls = bad; big = userOff ? 'Intercepted!' : 'Interception!';
    if (r.pick6) { G.score[D] += 6; big = userOff ? `Pick six! ${dN} score` : `Pick six! Touchdown ${dN}!`; G.pending = { kind: 'pat', kicker: D }; small.push('Returned all the way'); }
    else if (r.touchback) { changePoss(D, ownSpot(D, 20)); small.push('Caught in the end zone · Touchback'); }
    else { changePoss(D, G.ballX + s * r.spot); small.push(`${dN} ball on ${spot(G.ballX)}`); }
  } else if (r.td) {
    G.score[O] += 6; big = userOff ? 'Touchdown!' : `${oN} touchdown`; cls = good;
    small.push(`${r.yds}-yard ${r.kind === 'complete' ? 'pass' : 'run'}`);
    G.pending = { kind: 'pat', kicker: O };
  } else if (r.safety) {
    G.score[D] += 2; big = 'Safety!'; cls = bad;
    small.push(`${dN} get 2 points · ${oN} free kick from their 20`); G.pending = { kind: 'kickoff', kicker: O, from: 20 };
  } else if (r.fumble) {
    G.ballX += s * r.yds; big = `Fumble! ${dN} recover`; cls = bad;
    changePoss(D, G.ballX); small.push(`${dN} ball on ${spot(G.ballX)}`);
  } else {
    if (r.kind === 'incomplete') { big = userOff ? 'Incomplete' : 'Incomplete! Pass broken up'; cls = userOff ? '' : 'td'; }
    else if (r.kind === 'sack') { big = userOff ? `Sacked! Loss of ${-r.yds}` : `Sack! Loss of ${-r.yds}`; cls = bad; }
    else if (r.kind === 'complete') big = userOff ? `Complete! ${gainTxt(r.yds)}` : `${oN} complete it · ${gainTxt(r.yds)}`;
    else big = userOff ? (r.yds >= 20 ? `Big run! ${r.yds} yards` : r.yds > 0 ? `Gain of ${r.yds}` : r.yds === 0 ? 'No gain' : `Loss of ${-r.yds}`)
      : (r.yds >= 20 ? `${oN} break it · ${r.yds} yards` : r.yds > 0 ? `${oN} gain ${r.yds}` : r.yds === 0 ? 'Stuffed! No gain' : `Stopped! Loss of ${-r.yds}`);
    const y = r.kind === 'incomplete' ? 0 : r.yds;
    G.ballX += s * y;
    if (y >= G.toGo) { G.down = 1; G.toGo = Math.min(10, ytg()); small.push('First down!'); }
    else { G.down++; G.toGo -= y; }
    if (G.down > 4) { small.push(`Turnover on downs · ${dN} ball`); changePoss(D, G.ballX); }
  }
  small.push(userOff ? `${opN()} called ${r.defCall}` : `${opN()} ran ${r.call}`);
  if (G.cpuQ === 'shaky') small.push(`${opN()} missed their huddle`);
  if (G.cpuQ === 'blown') small.push(`${opN()} missed their huddle twice · Missed assignment`);
  (G.cpuNotes || []).forEach(n => small.push(n));
  const key = G.net ? '' : keyingOn(); if (key) small.push(key);
  if (G.userQ === 'shaky') small.push('Your second-chance huddle slowed you down');
  if (G.userQ === 'blown') small.push('Missed assignment on your defense');
  banner(big, small.join(' · ') + healed + quarterNote(), cls);
  G.mode = 'result'; G.resetCam = true; updateHud(); syncNote();
  $('#label').textContent = 'Result';
  showNext(nextLabel(), afterResult);
}
// Head-to-Head: a running record of the game state after every play, so tests can check both screens match.
function syncNote() { if (G.net) (G.syncLog = G.syncLog || []).push([G.seq, G.play, G.score.home, G.score.away, G.poss, Math.round(G.ballX * 10) / 10, G.down, Math.round(G.toGo * 10) / 10].join(',')); }
const quarterNote = () => (G.play % PLAYS_PER_QUARTER === 0 && G.play < PLAYS_PER_GAME && G.play !== PLAYS_PER_GAME / 2) ? ` · End of Quarter ${G.play / PLAYS_PER_QUARTER}` : '';
const nextLabel = () => G.pending && G.pending.kind === 'pat' ? 'Extra point' : G.play >= PLAYS_PER_GAME ? 'See final score' : G.play === PLAYS_PER_GAME / 2 && !G.halftimeDone ? 'Halftime' : 'Next play';
function afterResult() {
  G.flag = null; G.resetCam = false; G.defCall = null;
  if (G.pending && G.pending.kind === 'pat') return showCalls(); // extra point right after the touchdown, before any break
  if (G.play >= PLAYS_PER_GAME) return showFinal();
  if (G.lastKind === 'kickoff') G.brk.poss = G.poss; // a kickoff is not a break by itself
  G.lastKind = null;
  // Breaks come after a score, a change of possession, and the end of each quarter.
  const total = G.score.home + G.score.away;
  const why = [];
  if (total !== G.brk.score) why.push('score');
  if (G.poss !== G.brk.poss) why.push('poss');
  if (G.play > 0 && G.play % PLAYS_PER_QUARTER === 0 && G.qBreakAt !== G.play) { why.push('quarter'); G.qBreakAt = G.play; } // once per quarter, even with kicks after the last play
  const half = G.play === PLAYS_PER_GAME / 2 && !G.halftimeDone;
  let resume = () => { setFormation(); showCalls(); };
  if (half) {
    G.halftimeDone = true; G.goForIt = false;
    G.pending = { kind: 'kickoff', kicker: 'home' }; // Pelicans kick off to start the 2nd half
    resume = () => { showCalls(); banner('2nd half', `${TEAMS.home.short} kick off to start the 2nd half`, ''); };
  }
  G.brk = { poss: G.poss, score: total };
  if (!why.length) return resume();
  const cpuNote = G.net ? `The ${opN()} coach is spending skill points too.` : cpuBreak();
  // Quarter breaks always show the roster. Other breaks show it only when there are points to spend.
  if (why.includes('quarter') || G.points > 0) return openBreak(why, half, cpuNote, resume);
  resume();
}

// ---------- breaks: spend skill points ----------
// Solo mode: the computer gets a set number of points each break (by difficulty) and spends them on its weakest players.
function cpuBreak() {
  G.cpuPoints += CPU_BREAK_POINTS;
  const ups = {};
  while (G.cpuPoints > 0) {
    const open = POS.filter(p => G.ratings.away[p].now < RATING_CAP); if (!open.length) break;
    const low = Math.min(...open.map(p => G.ratings.away[p].now));
    const p = pick(open.filter(q => G.ratings.away[q].now === low)), r = G.ratings.away[p];
    r.now = Math.min(RATING_CAP, r.now + RATING_PER_POINT); G.cpuPoints--;
    ups[p] = (ups[p] || 0) + RATING_PER_POINT;
  }
  const list = Object.keys(ups).map(p => `${p} +${ups[p]}`);
  return list.length ? `Comets coach spent ${CPU_BREAK_POINTS} skill points: ${list.join(', ')}.` : '';
}
function openBreak(why, half, cpuNote, resume) {
  G.mode = 'break'; G.breakResume = resume; G.sel = G.sel || null;
  const q = Math.floor((G.play - 1) / PLAYS_PER_QUARTER) + 1;
  $('#bkTitle').textContent = half ? 'Halftime' : why.includes('quarter') ? `End of Quarter ${q}` : why.includes('score') ? 'Break · Score' : 'Break · Change of possession';
  $('#bkWhy').textContent = `${TEAMS.home.short} ${G.score.home}, ${TEAMS.away.short} ${G.score.away}`;
  $('#bkCpu').textContent = cpuNote;
  renderBreak();
  $('#break').classList.add('show');
  if (G.accom.readAloud) speak(`${$('#bkTitle').textContent}. You have ${G.points} skill point${G.points === 1 ? '' : 's'} to spend. Tap a player, then tap plus 1.`);
}
function renderBreak() {
  const R = G.ratings[G.me];
  $('#bkPts').textContent = `Skill points: ${G.points}`;
  $('#roster').innerHTML = POS.map(p => {
    const r = R[p];
    return `<button class="pcard${G.sel === p ? ' sel' : ''}" data-p="${p}"><div class="pn">${p}</div><div class="pi">${POS_INFO[p]}</div><div class="pr">${r.now}</div>` +
      `<div class="bar"><i style="width:${r.now}%"></i></div>` +
      (r.hurt ? `<div class="hurt"><span class="cross"></span>Shaken up · plays at ${r.start} for ${r.hurt} more play${r.hurt > 1 ? 's' : ''}</div>` : `<div class="ps">Started at ${r.start}</div>`) + `</button>`;
  }).join('');
  $$('.pcard').forEach(b => b.onclick = () => { G.sel = b.dataset.p; renderBreak(); });
  const btn = $('#plusBtn'), help = $('#bkHelp');
  if (!G.sel) { btn.disabled = true; btn.textContent = '+1'; }
  else {
    const r = R[G.sel], to = Math.min(RATING_CAP, r.now + RATING_PER_POINT);
    btn.textContent = r.now >= RATING_CAP ? `${G.sel} is maxed out` : `+1 ${G.sel} (${r.now} to ${to})`;
    btn.disabled = G.points < 1 || r.now >= RATING_CAP;
  }
  help.textContent = G.points < 1 ? 'No skill points left. Answer huddle questions to earn more (+2 first try, +1 second chance).'
    : `Tap a player, then tap +1. Each +1 adds ${RATING_PER_POINT} rating point${RATING_PER_POINT > 1 ? 's' : ''}. Unspent points carry over to the next break.`;
}
function spendPoint() {
  if (G.mode !== 'break' || !G.sel || G.points < 1) return;
  const r = G.ratings[G.me][G.sel]; if (r.now >= RATING_CAP) return;
  r.now = Math.min(RATING_CAP, r.now + RATING_PER_POINT); G.points--; G.spent++;
  updateHud(); renderBreak();
}
function closeBreak() {
  if (G.mode !== 'break') return;
  $('#break').classList.remove('show'); stopSpeech();
  const f = G.breakResume; G.breakResume = null; f();
}
function banner(b1, b2, cls) { $('#b1').textContent = b1; $('#b1').style.fontSize = b1.length > 24 ? '42px' : ''; $('#b2').textContent = b2 || ''; $('#b2').style.display = b2 ? '' : 'none'; const b = $('#banner'); b.className = ''; void b.offsetWidth; b.className = 'show ' + (cls || ''); }
function hideBanner() { $('#banner').className = ''; }
function showFinal() {
  G.mode = 'final'; if (G.net) netStop();
  logGameRow(true); flushLog(true);
  $('#copyBox').style.display = 'none'; $('#copyMsg').textContent = '';
  $('#fHome').textContent = G.score.home; $('#fAway').textContent = G.score.away;
  const h = G.score.home, a = G.score.away;
  const win = h > a ? 'home' : h < a ? 'away' : '';
  $('#fWin').textContent = win ? `${TEAMS[win].short} win${win === G.me ? '!' : ''}` : 'Tie game';
  const setLine = `Set: <b>${esc(APP.set ? APP.set.name : 'Sample')}</b><br>`;
  const scored = G.log.filter(e => !e.guess), ok = scored.filter(e => e.result === 'Right').length, flagged = G.log.length - scored.length;
  $('#fStats').innerHTML = setLine + `Questions right: <b>${G.right}</b> · wrong: <b>${G.wrong}</b>${scored.length ? ` · <b>${Math.round(100 * ok / scored.length)}%</b> correct` : ''}` +
    (flagged ? `<br>Guess-flagged answers (left out of % correct): <b>${flagged}</b>` : '') +
    (G.net ? `<br>Head-to-Head vs the <b>${opN()}</b> coach` : `<br>Computer: <b>${DIFF}</b> · missed ${G.cpuMisses || 0} huddle question${G.cpuMisses === 1 ? '' : 's'}`) +
    `<br>Skill points spent: <b>${G.spent}</b> · unspent: <b>${G.points}</b>${G.injuries ? ` · players shaken up: <b>${G.injuries}</b>` : ''}`;
  $('#again').textContent = G.net ? 'New game' : 'Play Again';
  $('#final').classList.add('show'); saveNote();
}
const ord = n => ['1st', '2nd', '3rd', '4th'][n - 1] || n + 'th';
function spot(x) { x = Math.round(x); return x === 50 ? 'the 50' : x < 50 ? `PEL ${x}` : `COM ${100 - x}`; }
function updateHud() {
  $('#homeScore').textContent = G.score.home; $('#awayScore').textContent = G.score.away;
  $('#homePoss').style.visibility = G.poss === 'home' ? 'visible' : 'hidden';
  $('#awayPoss').style.visibility = G.poss === 'away' ? 'visible' : 'hidden';
  const goal = G.toGo >= ytg();
  $('#dd').textContent = G.pending && G.mode !== 'result' ? `${KICK_NAMES[G.pending.kind]} · Ball on ${spot(G.ballX)}` : `${ord(G.down)} & ${goal ? 'Goal' : Math.max(1, Math.round(G.toGo))} · Ball on ${spot(G.ballX)}`;
  const p = Math.min(G.play, PLAYS_PER_GAME - 1);
  $('#sub').textContent = `${TEAMS[G.poss].short} ball · Quarter ${Math.floor(p / PLAYS_PER_QUARTER) + 1} · Play ${p % PLAYS_PER_QUARTER + 1} of ${PLAYS_PER_QUARTER}`;
  $('#chip').textContent = `Skill points: ${G.points}`;
  const hurt = [];
  for (const t of ['home', 'away']) POS.forEach(p => { const h = G.ratings[t][p].hurt; if (h > 0) hurt.push(`${t !== G.me ? TEAMS[t].short + ' ' : ''}${p} shaken up · ${h} play${h > 1 ? 's' : ''}`); });
  $('#trainer').classList.toggle('show', hurt.length > 0);
  $('#trainerTxt').textContent = hurt.join(' · ');
}

// ---------- main loop ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (G) {
    clockTick(now);
    if (G.mode === 'anim') {
      const t = (now - G.t0) / 1000;
      pose(G.plan, t);
      if (t > G.plan.T + 0.9) (G.plan.kick ? finishKick : finishPlay)();
    }
    const follow = G.mode === 'anim' || (G.mode === 'result' && G.resetCam);
    const target = follow ? camTarget(G.ball.x, 0) : camTarget(G.ballX, dir());
    G.camX += (target - G.camX) * Math.min(1, dt * 3.5);
    draw();
  }
  requestAnimationFrame(frame);
}

// ---------- screen fit, buttons, start ----------
function fit() { const s = Math.min(innerWidth / 1280, innerHeight / 720); $('#stage').style.transform = `scale(${s})`; }
addEventListener('resize', fit); fit();
$('#optRA').checked = QS.get('ra') === '1'; $('#optRC').checked = QS.get('rc') === '1'; $('#optET').checked = QS.get('et') === '1';
$('#ver').textContent = 'Build ' + INDEX_VERSION + ' · +1 = ' + RATING_PER_POINT + ' rating';
// Test pickers for the teacher settings (students will not see these once the gear menu exists).
$('#optLen').value = LENGTH; $('#optDiff').value = DIFF;
const titleBlurb = () => { $('#lenTxt').textContent = `${LENGTHS[LENGTH] ? LENGTH : 'Custom'} game: 4 quarters, ${PLAYS_PER_QUARTER} plays each.`; };
$('#optLen').onchange = $('#optDiff').onchange = () => { applySettings($('#optLen').value, $('#optDiff').value); titleBlurb(); updateHud(); };
titleBlurb();
$('#kick').onclick = () => pickSet(() => { $('#title').classList.remove('show'); newGame({ play: true }); });
$('#again').onclick = () => { $('#final').classList.remove('show'); if (G.net) { newGame(); showTitle(); } else newGame({ play: true }); };
$('#h2hBtn').onclick = () => pickSet(() => { newGame(); hostGame(); }); // the coach who makes the game picks the set
$('#joinOpen').onclick = () => { newGame(); joinScreen(); };
$('#joinBtn').onclick = joinGame;
$('#joinCode').onkeydown = e => { if (e.key === 'Enter') joinGame(); };
$('#netBack').onclick = () => showTitle();
$$('[data-exit]').forEach(b => b.onclick = () => { endGameEarly(); netLeave(); $('#net').classList.remove('show'); stopSpeech(); closeHuddle(); $('#break').classList.remove('show'); G.lockUntil = 0; $('#lock').classList.remove('on'); $('#final').classList.remove('show'); newGame(); showTitle(); });
$('#hSpeak').onclick = readQuestion;
$('#plusBtn').onclick = spendPoint;
$('#bkDone').onclick = closeBreak;
addEventListener('keydown', e => {
  if (G && G.mode === 'huddle' && !G.answered && document.activeElement !== $('#joinCode')) { const k = 'abcd'.indexOf(e.key.toLowerCase()); const n = '1234'.indexOf(e.key); const i = k >= 0 ? k : n; if (i >= 0 && i < G.q.choices.length) answer(i); }
});
newGame(); G.mode = 'title'; startup();
(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(frame));
