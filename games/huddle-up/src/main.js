// Huddle Up: game flow (build step 3). Pelicans = the student coach; Comets = computer coach.

function newGame() {
  const ratings = {};
  for (const side of ['home', 'away']) {
    ratings[side] = {};
    for (const p of POS) { const v = irnd(60, 70); ratings[side][p] = { start: v, now: v, hurt: 0 }; }
  }
  G = {
    score: { home: 0, away: 0 }, poss: 'home', ballX: 25, down: 1, toGo: 10, play: 0, points: 0, right: 0, wrong: 0,
    ratings, deck: [], camX: 33, mode: 'call', actors: [], ball: null, flag: null, halftimeDone: false,
    accom: { readAloud: $('#optRA').checked, reduced: $('#optRC').checked },
  };
  G.defCall = null; setFormation();
  G.camX = camTarget(G.ballX, dir());
  updateHud(); showCalls();
}
const userOnOffense = () => G.poss === 'home';
function changePoss(team, x) { G.poss = team; G.ballX = clamp(x, 1, 99); G.down = 1; G.toGo = Math.min(10, ytg()); }

// ---------- computer coach ----------
function cpuOffense() {
  const long = G.down >= 2 && G.toGo >= 8, short = G.toGo <= 2;
  return wpick(OFF_CALLS.map(c => [c, long ? (c.startsWith('Run') ? 1 : 3) : short ? (c.startsWith('Run') ? 4 : c === 'Play Action' ? 2 : 1) : 2]));
}
function cpuDefense() {
  const long = G.down >= 2 && G.toGo >= 8, short = G.toGo <= 2;
  return wpick(DEF_CALLS.map(c => [c, long ? ({ 'Zone': 3, 'Man Coverage': 3, 'Blitz': 2, 'Stack the Box': 1 }[c]) : short ? ({ 'Stack the Box': 3, 'Blitz': 2, 'Zone': 1, 'Man Coverage': 1 }[c]) : 2]));
}
const cpuGoesForIt = () => G.toGo <= 1 || (G.toGo <= 3 && ytg() <= 40);

// ---------- panel ----------
function showCalls() {
  G.mode = 'call'; hideBanner(); updateHud();
  const calls = $('#calls');
  if (userOnOffense()) {
    if (G.down === 4 && !G.goForIt) {
      $('#label').textContent = 'Coach Pelicans · 4th down · Your call';
      calls.innerHTML = `<button class="call" id="goFor">Go For It</button><button class="call" id="puntBtn">Punt</button><button class="call" disabled>Field Goal<small>Coming in step 8</small></button>`;
      $('#hint').textContent = 'Punts are automatic until special teams are built (step 8).';
      $('#goFor').onclick = () => { G.goForIt = true; showCalls(); };
      $('#puntBtn').onclick = punt;
      return;
    }
    $('#label').textContent = 'Coach Pelicans · Offense · Call the play';
    calls.innerHTML = OFF_CALLS.map(c => `<button class="call" data-call="${c}">${c}</button>`).join('');
    $('#hint').textContent = '';
    $$('[data-call]').forEach(b => b.onclick = () => callOffense(b.dataset.call));
  } else {
    if (G.down === 4 && !cpuGoesForIt()) {
      $('#label').textContent = 'Comets · 4th down';
      calls.innerHTML = ''; $('#hint').textContent = '';
      G.mode = 'cpuPunt'; setTimeout(() => { if (G.mode === 'cpuPunt') punt(); }, 700);
      return;
    }
    $('#label').textContent = 'Coach Pelicans · Defense · Call the defense' + (G.down === 4 ? ' · Comets are going for it!' : '');
    calls.innerHTML = DEF_CALLS.map(c => `<button class="call" data-call="${c}">${c}</button>`).join('');
    $('#hint').textContent = '';
    $$('[data-call]').forEach(b => b.onclick = () => callDefense(b.dataset.call));
  }
}
function showNext(text, fn) {
  $('#calls').innerHTML = `<button class="go" id="nextBtn">${text}</button>`;
  $('#hint').textContent = '';
  $('#nextBtn').onclick = fn;
}
function callOffense(call) {
  G.offCall = call; G.defCall = cpuDefense(); G.cpuQ = Math.random() < CPU_MISS ? 'shaky' : 'clean'; G.mods = {}; G.userQ = null;
  openHuddle(1, 'offense');
}
function callDefense(call) {
  G.defCall = call; G.offCall = cpuOffense(); G.cpuQ = Math.random() < CPU_MISS ? 'shaky' : 'clean'; G.mods = {}; G.userQ = null;
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
  $('#hTitle').textContent = (G.hSide === 'offense' ? 'Offense huddle · ' + G.offCall : 'Defense huddle · ' + G.defCall);
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
  const c = G.q.choices[i], off = G.hSide === 'offense';
  $$('.choice').forEach((b, j) => { b.disabled = true; if (G.q.choices[j].right) b.classList.add('right'); });
  if (!c.right) $$('.choice')[i].classList.add('wrong');
  const fb = $('#fb'), next = $('#hNext');
  if (c.right) {
    G.right++;
    const pts = G.attempt === 1 ? 2 : 1; G.points += pts; popPoints(pts);
    G.userQ = G.attempt === 1 ? 'clean' : 'shaky';
    fb.className = 'good';
    fb.textContent = G.attempt === 1 ? `Correct! Clean ${off ? 'execution' : 'read by the defense'}. +2 skill points.` : 'Correct! Confusion cleared up. +1 skill point.';
    next.textContent = 'Snap the ball'; next.onclick = snap;
  } else if (G.attempt === 1) {
    G.wrong++;
    fb.className = 'bad'; fb.textContent = 'Not quite. Penalty: ' + firstMissPenalty(off) + ' Answer one more to clear it up.';
    next.textContent = 'Second chance question'; next.onclick = () => openHuddle(2);
  } else {
    G.wrong++; fb.className = 'bad';
    if (off) { fb.textContent = 'Not quite. Flag on the play: delay of game, 5 yards. Replay the down.'; next.textContent = 'Back to the line'; next.onclick = delayOfGame; }
    else { G.userQ = 'blown'; fb.textContent = 'Not quite. Missed assignment! Your defense is out of position, so a big play is more likely.'; next.textContent = 'Snap the ball'; next.onclick = snap; }
  }
  if (G.accom.readAloud) speak((c.right ? 'Correct. ' : 'Not quite. The correct answer is: ' + G.q.src.a + '. ') + fb.textContent.replace(/^(Correct!|Not quite\.)\s*/, ''));
  updateHud();
  next.style.display = 'block';
}
// First miss: ONE random penalty from the options that can actually happen right now.
function firstMissPenalty(off) {
  const players = off ? RATINGS_USED[G.offCall][0] : DEF_PLAYERS[G.defCall];
  const canDrop = players.filter(p => G.ratings.home[p].now > G.ratings.home[p].start);
  const opts = ['field'];
  if (canDrop.length) opts.push('rating');
  if (G.points > 0) opts.push('point');
  const o = pick(opts);
  if (o === 'field') {
    if (off) { G.mods.slowSnap = true; return 'slower snap and worse blocking on this play.'; }
    G.mods.slowRead = true; return 'confusion and a slower read on this play.';
  }
  if (o === 'rating') { const p = pick(canDrop), r = G.ratings.home[p], was = r.now; r.now = Math.max(r.start, r.now - 2); return `${p} loses 2 rating points (${was} to ${r.now}).`; }
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
  const back = Math.min(5, Math.floor(ownYards()) / 2);
  const s = dir();
  G.ballX -= s * back; G.toGo += back; G.play++;
  G.flag = { x: G.ballX + s * (back - 1), d: .45 };
  G.defCall = null; setFormation();
  banner('Flag · Delay of game', `5-yard penalty · Replay ${ord(G.down)} down` + quarterNote(), 'flag');
  G.mode = 'result'; updateHud();
  showNext(nextLabel(), afterResult);
}
function snap() {
  closeHuddle();
  const oq = userOnOffense() ? G.userQ : G.cpuQ, dq = userOnOffense() ? G.cpuQ : G.userQ;
  const res = resolvePlay(G.offCall, G.defCall, oq, dq, G.mods);
  setFormation();
  G.res = res; G.plan = planPlay(res); G.mode = 'anim'; G.t0 = performance.now(); G.flag = null;
  $('#label').textContent = userOnOffense() ? `${G.offCall} vs ${G.defCall}` : `${G.defCall} vs Comets ${G.offCall}`;
  $('#calls').innerHTML = ''; $('#hint').textContent = '';
}
function punt() {
  const s = dir(), K = G.poss, R = other(K), toGoal = ytg();
  const dist = clamp(Math.round(40 + gauss() * 6), 28, 55);
  let big;
  G.play++; G.goForIt = false;
  if (dist >= toGoal) { changePoss(R, ownSpot(R, 20)); big = `${TEAMS[K].short} punt · Touchback`; }
  else { const ret = irnd(0, 10); changePoss(R, G.ballX + s * (dist - ret)); big = `${TEAMS[K].short} punt · ${dist} yards`; }
  const small = `${TEAMS[R].short} ball on ${spot(G.ballX)} · The punt team comes in step 8` + quarterNote();
  G.defCall = null; setFormation();
  banner(big, small, 'flag');
  G.mode = 'result'; updateHud();
  showNext(nextLabel(), afterResult);
}
function finishPlay() {
  const r = G.res, s = dir(), O = G.poss, D = other(O), userOff = O === 'home', dN = TEAMS[D].short;
  G.play++; G.goForIt = false;
  let big = '', cls = '';
  const small = [];
  const gainTxt = y => y > 0 ? `${y} yard${y === 1 ? '' : 's'}` : y === 0 ? 'no gain' : `loss of ${-y}`;
  const good = userOff ? 'td' : 'flag', bad = userOff ? 'flag' : 'td'; // banner colors from the Pelicans' point of view
  if (r.kind === 'int') {
    cls = bad; big = userOff ? 'Intercepted!' : 'Interception!';
    if (r.pick6) { G.score[D] += 7; big = userOff ? 'Pick six! Comets score' : 'Pick six! Touchdown Pelicans!'; changePoss(O, ownSpot(O, 25)); small.push('Returned all the way'); }
    else if (r.touchback) { changePoss(D, ownSpot(D, 20)); small.push('Caught in the end zone · Touchback'); }
    else { changePoss(D, G.ballX + s * r.spot); small.push(`${dN} ball on ${spot(G.ballX)}`); }
  } else if (r.td) {
    G.score[O] += 7; big = userOff ? 'Touchdown!' : 'Comets touchdown'; cls = good;
    small.push(`${r.yds}-yard ${r.kind === 'complete' ? 'pass' : 'run'} · Extra point is automatic for now`);
    changePoss(D, ownSpot(D, 25));
  } else if (r.safety) {
    G.score[D] += 2; big = 'Safety!'; cls = bad;
    small.push(`${dN} get 2 points and the ball`); changePoss(D, ownSpot(D, 30));
  } else if (r.fumble) {
    G.ballX += s * r.yds; big = userOff ? 'Fumble! Comets recover' : 'Fumble! Pelicans recover'; cls = bad;
    changePoss(D, G.ballX); small.push(`${dN} ball on ${spot(G.ballX)}`);
  } else {
    if (r.kind === 'incomplete') { big = userOff ? 'Incomplete' : 'Incomplete! Pass broken up'; cls = userOff ? '' : 'td'; }
    else if (r.kind === 'sack') { big = userOff ? `Sacked! Loss of ${-r.yds}` : `Sack! Loss of ${-r.yds}`; cls = bad; }
    else if (r.kind === 'complete') big = userOff ? `Complete! ${gainTxt(r.yds)}` : `Comets complete it · ${gainTxt(r.yds)}`;
    else big = userOff ? (r.yds >= 20 ? `Big run! ${r.yds} yards` : r.yds > 0 ? `Gain of ${r.yds}` : r.yds === 0 ? 'No gain' : `Loss of ${-r.yds}`)
      : (r.yds >= 20 ? `Comets break it · ${r.yds} yards` : r.yds > 0 ? `Comets gain ${r.yds}` : r.yds === 0 ? 'Stuffed! No gain' : `Stopped! Loss of ${-r.yds}`);
    const y = r.kind === 'incomplete' ? 0 : r.yds;
    G.ballX += s * y;
    if (y >= G.toGo) { G.down = 1; G.toGo = Math.min(10, ytg()); small.push('First down!'); }
    else { G.down++; G.toGo -= y; }
    if (G.down > 4) { small.push(`Turnover on downs · ${dN} ball`); changePoss(D, G.ballX); }
  }
  small.push(userOff ? `Comets called ${r.defCall}` : `Comets ran ${r.call}`);
  if (G.cpuQ === 'shaky') small.push('Comets missed their huddle');
  if (G.userQ === 'shaky') small.push('Your second-chance huddle slowed you down');
  if (G.userQ === 'blown') small.push('Missed assignment on your defense');
  banner(big, small.join(' · ') + quarterNote(), cls);
  G.mode = 'result'; G.resetCam = true; updateHud();
  $('#label').textContent = 'Result';
  showNext(nextLabel(), afterResult);
}
const quarterNote = () => (G.play % PLAYS_PER_QUARTER === 0 && G.play < PLAYS_PER_GAME && G.play !== PLAYS_PER_GAME / 2) ? ` · End of Quarter ${G.play / PLAYS_PER_QUARTER}` : '';
const nextLabel = () => G.play >= PLAYS_PER_GAME ? 'See final score' : G.play === PLAYS_PER_GAME / 2 && !G.halftimeDone ? 'Halftime' : 'Next play';
function afterResult() {
  G.flag = null; G.resetCam = false; G.defCall = null;
  if (G.play >= PLAYS_PER_GAME) return showFinal();
  if (G.play === PLAYS_PER_GAME / 2 && !G.halftimeDone) {
    G.halftimeDone = true; G.goForIt = false;
    changePoss('away', ownSpot('away', 25)); setFormation(); updateHud();
    banner('Halftime', 'Comets get the ball to start the 2nd half · Skill point breaks come in step 4', '');
    G.mode = 'result';
    return showNext('Start the 2nd half', () => { setFormation(); showCalls(); });
  }
  setFormation(); showCalls();
}
function banner(b1, b2, cls) { $('#b1').textContent = b1; $('#b2').textContent = b2 || ''; $('#b2').style.display = b2 ? '' : 'none'; const b = $('#banner'); b.className = ''; void b.offsetWidth; b.className = 'show ' + (cls || ''); }
function hideBanner() { $('#banner').className = ''; }
function showFinal() {
  G.mode = 'final';
  $('#fHome').textContent = G.score.home; $('#fAway').textContent = G.score.away;
  const n = G.right + G.wrong, h = G.score.home, a = G.score.away;
  $('#fWin').textContent = h > a ? 'Pelicans win!' : h < a ? 'Comets win' : 'Tie game';
  $('#fStats').innerHTML = `Questions right: <b>${G.right}</b> · wrong: <b>${G.wrong}</b>${n ? ` (${Math.round(100 * G.right / n)}%)` : ''}<br>Skill points saved: <b>${G.points}</b> (spending them on players comes in step 4)`;
  $('#final').classList.add('show');
}
const ord = n => ['1st', '2nd', '3rd', '4th'][n - 1] || n + 'th';
function spot(x) { x = Math.round(x); return x === 50 ? 'the 50' : x < 50 ? `PEL ${x}` : `COM ${100 - x}`; }
function updateHud() {
  $('#homeScore').textContent = G.score.home; $('#awayScore').textContent = G.score.away;
  $('#homePoss').style.visibility = G.poss === 'home' ? 'visible' : 'hidden';
  $('#awayPoss').style.visibility = G.poss === 'away' ? 'visible' : 'hidden';
  const goal = G.toGo >= ytg();
  $('#dd').textContent = `${ord(G.down)} & ${goal ? 'Goal' : Math.max(1, Math.round(G.toGo))} · Ball on ${spot(G.ballX)}`;
  const p = Math.min(G.play, PLAYS_PER_GAME - 1);
  $('#sub').textContent = `${TEAMS[G.poss].short} ball · Quarter ${Math.floor(p / PLAYS_PER_QUARTER) + 1} · Play ${p % PLAYS_PER_QUARTER + 1} of ${PLAYS_PER_QUARTER}`;
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
