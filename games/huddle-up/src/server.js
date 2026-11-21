
// ---------- Sheet connection (build step 8) ----------
// Inside Apps Script the page talks to Code.gs: who is signed in, the Roster accommodations, the open
// question sets, the teacher settings, and logging every answer (Results tab) and every game (Games tab).
// Opened outside Apps Script (downloaded file or test page), PREVIEW below stands in for Code.gs.
const HAS_SERVER = typeof google !== 'undefined' && !!(google.script && google.script.run);
const IS_TEST = !HAS_SERVER || (typeof SERVER_TEST !== 'undefined' && SERVER_TEST === true); // test link (?test=1) or preview
const APP = { email: '', codeEmail: '', student: {}, sets: [], settings: null, set: null, tab: '', qcache: {}, pin: '' };
const playerEmail = () => APP.codeEmail || APP.email || '';
const PREVIEW_PIN = '1234';
const sampleQuestions = () => SAMPLE_QUESTIONS.map(r => ({ q: r[0], a: r[1], w: [r[2], r[3], r[4]].filter(Boolean), teks: r[7] || '' }));

const PREVIEW = {
  getStartupData() {
    const sets = [{ number: 1, name: 'Sample: Great Depression', questionTab: 'Sample Great Depression' }];
    if (QS.get('sets') === '2') sets.push({ number: 2, name: 'Sample: Short set', questionTab: 'Short set' });
    return { email: 'preview', preview: true, sets, settings: null, version: 'preview',
      student: { onRoster: true, name: 'Preview Student', period: '1', readAloud: QS.get('ra') === '1', extended: QS.get('et') === '1', reduced: QS.get('rc') === '1' } };
  },
  getQuestions(tab) { const q = sampleQuestions(); return { tab, error: '', questions: tab === 'Short set' ? q.slice(0, 4) : q }; },
  logAnswers(rows) { (window.__log = window.__log || []).push(...rows); return rows.length; },
  logGame(g, email) { (window.__games = window.__games || []).push(Object.assign({ email }, g)); return { ok: true }; },
  registerStudent() { return { ok: true, student: this.getStartupData().student }; },
  redeemBackupCode() { return { ok: false, error: 'Backup codes only work in the real game.' }; },
  checkTeacherPin(pin) { return pin === PREVIEW_PIN ? { ok: true, settings: currentSettings() } : { ok: false, error: `That PIN is not right. (Preview PIN: ${PREVIEW_PIN})` }; },
  saveTeacherSettings(pin, s) {
    if (pin !== PREVIEW_PIN) return { ok: false, error: 'That PIN is not right.' };
    const ppq = { Quick: 6, Standard: 12, 'Full Period': 18 }[s.length] || clamp(parseInt(s.length, 10) || 12, 3, 25);
    return { ok: true, settings: { length: LENGTHS[s.length] ? s.length : String(ppq), ppq, difficulty: s.difficulty, rpp: +s.rpp, clock: +s.clock, readAll: s.readAll === 'Yes' } };
  },
};
function serverCall(fn, ...args) {
  if (!HAS_SERVER) return new Promise((res, rej) => { try { res(PREVIEW[fn](...args)); } catch (e) { rej(e); } });
  return new Promise((res, rej) => google.script.run.withSuccessHandler(res).withFailureHandler(rej)[fn](...args));
}
const currentSettings = () => ({ length: LENGTH, ppq: PLAYS_PER_QUARTER, difficulty: DIFF, rpp: RATING_PER_POINT, clock: PLAY_CLOCK, readAll: READ_ALL });

// ---------- screens ----------
const SCREENS = ['loading', 'signin', 'sets', 'teacher', 'title', 'net', 'final'];
function showScreen(id) { SCREENS.forEach(s => $('#' + s).classList.toggle('show', s === id)); }

// ---------- startup and sign-in ----------
function startup() {
  document.body.classList.toggle('test', IS_TEST);
  if (!HAS_SERVER) return onStartup(PREVIEW.getStartupData()); // preview: no waiting
  showScreen('loading'); $('#loadMsg').textContent = 'Asking the class Sheet who you are...';
  serverCall('getStartupData').then(onStartup, err => { $('#loadMsg').textContent = `The game could not reach the class Sheet (${err}). Reload the page to try again.`; });
}
function onStartup(data) {
  APP.email = data.email || ''; APP.student = data.student || {}; APP.sets = data.sets || [];
  if (data.settings) applyServerSettings(data.settings);
  if (!HAS_SERVER) APP.qcache['Sample Great Depression'] = sampleQuestions();
  if (HAS_SERVER && !APP.email) return showSignin(false);
  if (HAS_SERVER && !String(APP.student.period || '').trim()) return showSignin(true);
  signedIn();
}
function signedIn() {
  // Accommodations come from the Roster checkboxes. The test options (test link only) start from them too.
  const s = APP.student;
  $('#optRA').checked = !!s.readAloud || QS.get('ra') === '1';
  $('#optRC').checked = !!s.reduced || QS.get('rc') === '1';
  $('#optET').checked = !!s.extended || QS.get('et') === '1';
  if (APP.sets.length === 1) loadSet(APP.sets[0]).catch(() => { }); // get the questions ready in the background
  showTitle();
}
function showSignin(needPeriod) {
  $('#periodCard').style.display = needPeriod ? '' : 'none';
  $('#codeCard').style.display = needPeriod ? 'none' : '';
  $('#periodMsg').textContent = ''; $('#codeMsg').textContent = '';
  $('#periodGrid').innerHTML = [1, 2, 3, 4, 5, 6, 7, 8].map(p => `<button data-period="${p}">${p}</button>`).join('');
  $$('[data-period]').forEach(b => b.onclick = () => choosePeriod(+b.dataset.period));
  showScreen('signin');
  if (!needPeriod) setTimeout(() => $('#codeInput').focus(), 50);
}
function choosePeriod(p) {
  const btns = $$('[data-period]'); btns.forEach(b => b.disabled = true); $('#periodMsg').textContent = `Saving period ${p}...`;
  serverCall('registerStudent', p).then(res => {
    if (!res || !res.ok) { $('#periodMsg').textContent = (res && res.error) || 'Could not save your period. Try again.'; btns.forEach(b => b.disabled = false); return; }
    APP.student = res.student; signedIn();
  }, err => { $('#periodMsg').textContent = `Could not save your period (${err}). Try again.`; btns.forEach(b => b.disabled = false); });
}
function redeemCode() {
  const code = $('#codeInput').value.trim(); $('#codeMsg').textContent = 'Checking...'; $('#codeBtn').disabled = true;
  serverCall('redeemBackupCode', code).then(res => {
    $('#codeBtn').disabled = false;
    if (!res || !res.ok) { $('#codeMsg').textContent = (res && res.error) || 'That code did not work.'; return; }
    APP.codeEmail = res.email; APP.student = res.student; signedIn();
  }, err => { $('#codeBtn').disabled = false; $('#codeMsg').textContent = `Could not check the code (${err}).`; });
}
function showTitle() {
  stopSpeech(); showScreen('title'); if (G) G.mode = 'title';
  const s = APP.student, bits = [];
  if (s.name) bits.push(`Coach ${s.name}`); if (s.period) bits.push(`Period ${s.period}`);
  if (APP.sets.length === 1) bits.push(APP.sets[0].name);
  $('#who').textContent = bits.join(' · ');
  titleBlurb();
}

// ---------- question sets ----------
function loadSet(s) {
  if (APP.qcache[s.questionTab]) return Promise.resolve(APP.qcache[s.questionTab]);
  return serverCall('getQuestions', s.questionTab).then(res => {
    if (!res || res.error || !res.questions || !res.questions.length) throw new Error((res && res.error) || 'No questions found in that set.');
    APP.qcache[s.questionTab] = res.questions.map(q => ({ q: q.q, a: q.a, w: (q.w || []).filter(Boolean), teks: q.teks || '' }));
    return APP.qcache[s.questionTab];
  });
}
function useSet(s) { APP.set = s; APP.tab = s.questionTab; QUESTIONS = APP.qcache[s.questionTab]; if (G) G.deck = []; }
// Pick a question set, then run done(). Skipped when only one set is open. Runs right away if the questions are ready.
function pickSet(done) {
  const sets = APP.sets;
  if (!sets.length) {
    showScreen('sets'); $('#setGrid').innerHTML = '';
    $('#setMsg').textContent = 'No review sets are open yet. Your teacher opens them in the Sets tab of the class Sheet.';
    return;
  }
  if (sets.length === 1) return chooseSet(sets[0], done);
  showScreen('sets'); $('#setMsg').textContent = '';
  $('#setGrid').innerHTML = sets.map((s, i) => `<button data-set="${i}">${esc(s.name)}</button>`).join('');
  $$('[data-set]').forEach(b => b.onclick = () => chooseSet(sets[+b.dataset.set], done));
  if (G && G.accom && G.accom.readAloud) speak('Pick a review set. ' + sets.map(s => s.name).join('. '));
}
function chooseSet(s, done) {
  if (APP.qcache[s.questionTab]) { useSet(s); $('#sets').classList.remove('show'); return done(); }
  showScreen('sets'); $('#setGrid').innerHTML = ''; $('#setMsg').style.color = '#C8D3E3'; $('#setMsg').textContent = `Loading ${s.name}...`;
  loadSet(s).then(() => { $('#setMsg').style.color = ''; $('#setMsg').textContent = ''; useSet(s); $('#sets').classList.remove('show'); done(); },
    err => { $('#setMsg').style.color = ''; $('#setMsg').textContent = `Could not load the questions: ${err.message || err}`; });
}

// ---------- teacher settings (gear icon, locked with the Teacher PIN from the Settings tab) ----------
function applyServerSettings(s) {
  APP.settings = s;
  applySettings(LENGTHS[s.length] ? s.length : s.ppq, s.difficulty);
  RATING_PER_POINT = [1, 2, 3].includes(+s.rpp) ? +s.rpp : 2;
  PLAY_CLOCK = [15, 20, 30].includes(+s.clock) ? +s.clock : 0;
  READ_ALL = !!s.readAll;
  const sel = $('#optLen');
  if (!LENGTHS[LENGTH] && !sel.querySelector(`option[value="${LENGTH}"]`)) sel.insertAdjacentHTML('beforeend', `<option value="${LENGTH}">Custom (${LENGTH})</option>`);
  sel.value = LENGTH; $('#optDiff').value = DIFF;
  $('#ver').textContent = 'Build ' + INDEX_VERSION + ' · +1 = ' + RATING_PER_POINT + ' rating' + (PLAY_CLOCK ? ` · play clock ${PLAY_CLOCK} s` : '');
}
function openTeacher() {
  showScreen('teacher'); $('#pinCard').style.display = ''; $('#setCard').style.display = 'none';
  $('#pinInput').value = ''; $('#pinMsg').textContent = HAS_SERVER && APP.settings && !APP.settings.pinSet ? 'No Teacher PIN yet. Type one in the Settings tab of the class Sheet, then reload the game.' : '';
  setTimeout(() => $('#pinInput').focus(), 50);
}
function unlockTeacher() {
  const pin = $('#pinInput').value.trim(); if (!pin) { $('#pinMsg').textContent = 'Type the PIN first.'; return; }
  $('#pinBtn').disabled = true; $('#pinMsg').textContent = 'Checking...';
  serverCall('checkTeacherPin', pin).then(res => {
    $('#pinBtn').disabled = false;
    if (!res || !res.ok) { $('#pinMsg').textContent = (res && res.error) || 'That PIN is not right.'; return; }
    APP.pin = pin; fillTeacher(res.settings || currentSettings());
    $('#pinCard').style.display = 'none'; $('#setCard').style.display = ''; $('#tMsg').textContent = '';
  }, err => { $('#pinBtn').disabled = false; $('#pinMsg').textContent = `Could not check the PIN (${err}).`; });
}
function fillTeacher(s) {
  const custom = !LENGTHS[s.length];
  $('#tLen').value = custom ? 'Custom' : s.length; $('#tPlays').value = custom ? (s.ppq || s.length) : 8;
  $('#tDiff').value = s.difficulty || 'Normal'; $('#tRpp').value = String(s.rpp || 2); $('#tClock').value = String(s.clock || 0); $('#tRA').value = s.readAll ? 'Yes' : 'No';
  customShown();
}
function customShown() { const on = $('#tLen').value === 'Custom'; $('#tPlays').style.visibility = $('#tPlaysLbl').style.visibility = on ? 'visible' : 'hidden'; }
function saveTeacher() {
  const len = $('#tLen').value === 'Custom' ? String(clamp(parseInt($('#tPlays').value, 10) || 8, 3, 25)) : $('#tLen').value;
  const s = { length: len, difficulty: $('#tDiff').value, rpp: $('#tRpp').value, clock: $('#tClock').value, readAll: $('#tRA').value };
  $('#tSave').disabled = true; $('#tMsg').style.color = '#C8D3E3'; $('#tMsg').textContent = 'Saving...';
  serverCall('saveTeacherSettings', APP.pin, s).then(res => {
    $('#tSave').disabled = false; $('#tMsg').style.color = '';
    if (!res || !res.ok) { $('#tMsg').textContent = (res && res.error) || 'Could not save.'; return; }
    applyServerSettings(res.settings); fillTeacher(res.settings);
    $('#tMsg').style.color = '#86EFAC'; $('#tMsg').textContent = 'Saved. ' + `${lengthName()} game, computer ${DIFF}, +1 = ${RATING_PER_POINT} rating, play clock ${PLAY_CLOCK ? PLAY_CLOCK + ' seconds' : 'off'}, read aloud for everyone ${READ_ALL ? 'on' : 'off'}.`;
  }, err => { $('#tSave').disabled = false; $('#tMsg').style.color = ''; $('#tMsg').textContent = `Could not save (${err}).`; });
}

// ---------- play clock (off unless the teacher turns it on; extended time doubles it) ----------
function clockTick(now) {
  const el = $('#hClock');
  if (!G || G.mode !== 'huddle' || !G.clockLimit || G.answered) { if (el.style.display !== 'none' && (!G || G.mode !== 'huddle' || !G.clockLimit)) el.style.display = 'none'; return; }
  if (now < G.lockUntil) return;
  const left = G.clockLimit - Math.max(0, now - G.clockStart) / 1000;
  el.style.display = 'inline-block'; el.textContent = Math.max(0, Math.ceil(left)) + 's'; el.classList.toggle('low', left <= 5);
  if (left <= 0) answer(-1); // time ran out: counts as a missed answer
}

// ---------- Results logging (small batches; the last 2 wait in case they get guess-flagged) ----------
const LOG = { queue: [], sending: false, again: false, sent: 0, failed: false };
function logAnswer(e) { e.set = APP.set ? APP.set.name : 'Sample'; e.tab = APP.tab || ''; LOG.queue.push(e); flushLog(false); }
const toRow = e => ({ time: e.time, email: playerEmail(), set: e.set, tab: e.tab, question: e.question, teks: e.teks, result: e.result, accom: e.accom, guess: !!e.guess, event: e.event });
function flushLog(force) {
  if (LOG.sending) { if (force) LOG.again = true; return; }
  const n = LOG.queue.length - (force ? 0 : 2); if (n <= 0 || (!force && n < 3)) return;
  const batch = LOG.queue.splice(0, n); LOG.sending = true;
  serverCall('logAnswers', batch.map(toRow)).then(() => {
    LOG.sending = false; LOG.sent += batch.length; LOG.failed = false; saveNote();
    if (LOG.again) { LOG.again = false; flushLog(true); }
  }, () => { LOG.sending = false; LOG.failed = true; LOG.queue = batch.concat(LOG.queue); saveNote(); setTimeout(() => flushLog(true), 8000); });
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushLog(true); });
addEventListener('pagehide', () => { flushLog(true); logGameRow(false); });

// ---------- Games tab (one row per game; Head-to-Head is written once for both coaches) ----------
const gameStarted = () => G && G.started && !G.gameLogged && (G.play > 0 || G.log.length > 0);
function logGameRow(finished) {
  if (!gameStarted()) return;
  G.gameLogged = true;
  const row = { code: G.net ? G.net.code : '', side: G.me, set: APP.set ? APP.set.name : 'Sample', difficulty: G.net ? '' : DIFF,
    length: lengthName(), home: G.score.home, away: G.score.away, finished: !!finished, plays: G.play };
  const g = G;
  serverCall('logGame', row, playerEmail()).then(() => { g.gameSaved = true; saveNote(); }, () => { g.gameSaved = false; g.gameFailed = true; saveNote(); });
}
function saveNote() {
  const el = $('#saveNote'); if (!el || !G || G.mode !== 'final') return;
  el.textContent = !HAS_SERVER ? 'Preview: results are not saved to a Sheet.'
    : LOG.failed || G.gameFailed ? 'Saving to the class Sheet... (retrying)'
    : LOG.queue.length || !G.gameSaved ? 'Saving to the class Sheet...' : 'Saved to the class Sheet.';
}
// Leaving a game early (Exit / Start Over): save what was played.
function endGameEarly() { if (gameStarted() && G.mode !== 'final') logGameRow(false); flushLog(true); }

// ---------- final screen: Copy Results for Google Classroom ----------
function resultsText() {
  const h = G.score.home, a = G.score.away, mine = G.score[G.me], theirs = G.score[other(G.me)];
  const scored = G.log.filter(e => !e.guess), ok = scored.filter(e => e.result === 'Right').length;
  const d = new Date(), date = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  const outcome = mine > theirs ? 'Win' : mine < theirs ? 'Loss' : 'Tie';
  return [`Huddle Up results · ${APP.student.name || 'Student'}${APP.student.period ? ' · Period ' + APP.student.period : ''} · ${date}`,
    `Set: ${APP.set ? APP.set.name : 'Sample'} · ${G.net ? 'Head-to-Head' : 'Solo vs Computer (' + DIFF + ')'} · ${lengthName()} game`,
    `Final: Pelicans ${h}, Comets ${a} (${outcome}) · Questions: ${G.right} right, ${G.wrong} wrong` + (scored.length ? ` · ${Math.round(100 * ok / scored.length)}% correct` : '')].join('\n');
}
function copyResults() {
  const text = resultsText(), box = $('#copyBox'), msg = $('#copyMsg');
  box.value = text; box.style.display = 'block';
  const done = () => { msg.textContent = 'Copied. Paste it into your Google Classroom assignment.'; };
  const fallback = () => { box.focus(); box.select(); let okc = false; try { okc = document.execCommand('copy'); } catch (e) { } msg.textContent = okc ? 'Copied. Paste it into your Google Classroom assignment.' : 'Select the text in the box, press Ctrl+C, then paste it into Google Classroom.'; };
  try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(done, fallback); } catch (e) { }
  fallback();
}

// ---------- buttons ----------
$('#codeBtn').onclick = redeemCode;
$('#codeInput').onkeydown = e => { if (e.key === 'Enter') redeemCode(); };
$('#signinRetry').onclick = startup;
$('#setsBack').onclick = () => showTitle();
$('#gearBtn').onclick = openTeacher;
$('#pinBtn').onclick = unlockTeacher;
$('#pinInput').onkeydown = e => { if (e.key === 'Enter') unlockTeacher(); };
$('#tLen').onchange = customShown;
$('#tSave').onclick = saveTeacher;
$('#teacherBack').onclick = () => { APP.pin = ''; showTitle(); };
$('#copyBtn').onclick = copyResults;
