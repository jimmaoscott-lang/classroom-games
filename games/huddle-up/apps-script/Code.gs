/**
 * HUDDLE UP - football coach review game
 * Code.gs  |  Build 8 (full version: Sheet connection and reports)
 *
 * Built from Studio 68's Code.gs (games/studio-68/apps-script/Code.gs).
 * - Serves the game page from GitHub (live branch for students, ?test=1 for main)
 * - Roster sign-in, self sign-up by class period, backup codes
 * - Sets tab picks which question tabs are open
 * - Writes every answer to Results and every game to Games
 * - Teacher settings in the Settings tab (game length, computer difficulty, rating per skill point,
 *   play clock, read aloud for everyone), changed from the game's gear icon with the Teacher PIN
 * - Head-to-Head on two computers (game codes and syncing in CacheService)
 * - Teacher menu "Huddle Up": Set up tabs, Update reports, Make student report, Make backup codes
 * Dropped from Studio 68: Saves, Radio, Song Plays, and the Difficulty column.
 */

var GAME_VERSION = 'Build 8';

// The game page loads straight from GitHub, so new builds need no pasting.
//   Student link:       .../exec          -> the "live" branch
//   Teacher test link:  .../exec?test=1   -> the "main" branch (newest build, not live yet)
// If GitHub cannot be reached, the small Index file saved in this Apps Script project is shown.
var GITHUB_RAW = 'https://raw.githubusercontent.com/jimmaoscott-lang/classroom-games/';
var PAGE_PATH = '/games/huddle-up/game/index.html';
var LIVE_BRANCH = 'live';
var TEST_BRANCH = 'main';

var ROSTER_HEADERS = ['School email', 'Student name', 'Class period', 'Read aloud', 'Extended time',
  'Reduced choices', 'Notes', 'Backup code'];
var SETS_HEADERS = ['Set number', 'Set name', 'Question tab', 'Open?'];
var QUESTION_HEADERS = ['Question', 'Correct answer', 'Wrong answer 1', 'Wrong answer 2', 'Wrong answer 3',
  'Wrong answer 4', 'Resource tag', 'TEKS'];
var RESULTS_HEADERS = ['Time', 'Student email', 'Class period', 'Set', 'Question tab',
  'Question', 'TEKS', 'Right/Wrong', 'Accommodations active', 'Guess flag', 'Event tag'];
var GAMES_HEADERS = ['Time', 'Player 1', 'Player 2', 'Class period', 'Set', 'Mode', 'Difficulty',
  'Game length', 'Score', 'Winner', 'Finished?'];
var SETTINGS_HEADERS = ['Setting', 'Value', 'What it does'];
var GOALS_HEADERS = ['School email', 'Student name', 'IEP goal TEKS (commas)', 'Notes'];

var SUMMARY_HEADERS = ['Student email', 'Student name', 'Class period', 'Questions answered',
  '% correct', 'Games played', 'Class most-missed questions'];
var PROGRESS_HEADERS = ['Student email', 'Student name', 'Class period', 'TEKS', 'Questions answered',
  '% correct (guesses left out)', 'Guess-flagged answers', 'First attempt date', 'First attempt % correct',
  'Latest attempt date', 'Latest attempt % correct', 'Accommodations used'];

// Columns in Results (0-based)
var R_TIME = 0, R_EMAIL = 1, R_PERIOD = 2, R_QUESTION = 5, R_TEKS = 6, R_RESULT = 7, R_ACCOM = 8, R_GUESS = 9;

var CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no I, O, 0, 1 (easy to mix up)
var SAMPLE_TAB = 'Sample Great Depression';

/* =========================================================
   TEACHER SETTINGS (Settings tab: Setting | Value | What it does)
   ========================================================= */
var GAME_SETTINGS = [
  ['Teacher PIN', '', 'PIN for the gear icon on the game title screen. Use 4 or more numbers. Students never see it.'],
  ['Game length', 'Standard', 'Quick (6 plays a quarter, about 15 min), Standard (12, about 30 min), Full Period (18, about 45 min), or a number from 3 to 25 for a custom length.'],
  ['Computer difficulty', 'Normal', 'Easy, Normal, Hard or Expert. How often the computer team misses its huddle in Solo games.'],
  ['Rating per skill point', '2', '1, 2 or 3. Rating points a player gains for each +1 a student buys.'],
  ['Play clock', 'Off', 'Off, 15, 20 or 30 seconds per huddle question. Extended time doubles it. Running out counts as a missed answer.'],
  ['Read aloud for everyone', 'No', 'Yes reads every question aloud for every student. Roster read-aloud students always get it.']
];
var REPORT_SETTINGS = [
  ['Report start date', '', 'Class Overview and Student Report count answers from this date on. Blank = all dates.'],
  ['Report end date', '', 'Class Overview and Student Report count answers through this date. Blank = all dates.']
];
var LENGTH_NAMES = { 'quick': 'Quick', 'standard': 'Standard', 'full period': 'Full Period', 'full': 'Full Period' };
var DIFF_NAMES = { 'easy': 'Easy', 'normal': 'Normal', 'hard': 'Hard', 'expert': 'Expert' };

/* =========================================================
   WEB APP
   ========================================================= */
function doGet(e) {
  var test = !!(e && e.parameter && String(e.parameter.test) === '1');
  var html = fetchGameHtml_(test ? TEST_BRANCH : LIVE_BRANCH);
  // Tell the page whether it is the teacher test link (shows the test options).
  if (html) html = html.replace('// HUDDLEUP_PAGE', '// HUDDLEUP_PAGE\nvar SERVER_TEST = ' + (test ? 'true' : 'false') + ';');
  var out = html ? HtmlService.createHtmlOutput(html) : HtmlService.createHtmlOutputFromFile('Index');
  return out
    .setTitle('Huddle Up')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Downloads the game page from a GitHub branch. Returns '' if anything goes wrong. */
function fetchGameHtml_(branch) {
  try {
    var res = UrlFetchApp.fetch(GITHUB_RAW + branch + PAGE_PATH, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return '';
    var text = res.getContentText('UTF-8');
    return text.indexOf('HUDDLEUP_PAGE') >= 0 && text.indexOf('</html>') > 0 ? text : '';
  } catch (err) {
    return '';
  }
}

/** Which build each link is running (menu: Huddle Up > Check game version). */
function checkGameVersion() {
  function ver(branch) {
    var t = fetchGameHtml_(branch);
    var m = t.match(/INDEX_VERSION = '([^']+)'/);
    return t ? (m ? m[1] : 'found, version unknown') : 'not on GitHub yet (or GitHub blocked)';
  }
  var msg = 'Student link (live): ' + ver(LIVE_BRANCH) + '  |  Test link (?test=1): ' + ver(TEST_BRANCH) +
    '  |  Code.gs: ' + GAME_VERSION;
  Logger.log(msg);
  toast_(msg);
  return msg;
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Huddle Up')
    .addItem('Set up tabs', 'setupTabs')
    .addItem('Update reports', 'updateReports')
    .addItem('Make student report', 'makeStudentReport')
    .addItem('Make backup codes', 'makeBackupCodes')
    .addSeparator()
    .addItem('Check game version', 'checkGameVersion')
    .addToUi();
}

/** Called by the game when it first opens. */
function getStartupData() {
  var email = currentEmail_();
  return {
    email: email,
    student: readStudent_(email),
    sets: readSets_(),
    settings: publicSettings_(),
    version: GAME_VERSION
  };
}

function currentEmail_() {
  try { return Session.getActiveUser().getEmail() || ''; } catch (err) { return ''; }
}

/** The email to record: Google's, or the one a backup code was redeemed for. */
function who_(email) {
  return String(currentEmail_() || email || '').trim().toLowerCase();
}

/* =========================================================
   TEACHER SETUP
   ========================================================= */
function setupTabs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var made = [];
  function ensure(name, headers) {
    if (!ss.getSheetByName(name)) made.push(name);
    return getOrMakeSheet_(name, headers);
  }
  ensure('Roster', ROSTER_HEADERS);
  var sets = ensure('Sets', SETS_HEADERS);
  var sampleIsNew = !ss.getSheetByName(SAMPLE_TAB);
  var sample = ensure(SAMPLE_TAB, QUESTION_HEADERS);
  if (sampleIsNew && sample.getLastRow() < 2) {
    sample.getRange(2, 1, SAMPLE_QUESTIONS.length, QUESTION_HEADERS.length).setValues(SAMPLE_QUESTIONS);
  }
  if (sets.getLastRow() < 2) sets.getRange(2, 1, 1, 4).setValues([[1, 'Sample: Great Depression', SAMPLE_TAB, 'Yes']]);
  ensure('Results', RESULTS_HEADERS);
  ensure('Games', GAMES_HEADERS);
  if (!ss.getSheetByName('Settings')) made.push('Settings');
  ensureSettings_();
  ensure('Goals', GOALS_HEADERS);
  if (!ss.getSheetByName('Student Report')) made.push('Student Report');
  refreshStudentPicker_();
  toast_((made.length ? 'Made tabs: ' + made.join(', ') + '.' : 'All tabs were already set up.') +
    (settingValue_('teacher pin') ? '' : ' Type a Teacher PIN in the Settings tab so you can use the gear icon in the game.'));
}

/** Adds any missing setting rows (game settings and report dates) to the Settings tab. */
function ensureSettings_() {
  var sheet = getOrMakeSheet_('Settings', SETTINGS_HEADERS);
  var last = sheet.getLastRow();
  var names = last > 1 ? sheet.getRange(2, 1, last - 1, 1).getDisplayValues().map(function (r) {
    return String(r[0]).trim().toLowerCase();
  }) : [];
  GAME_SETTINGS.concat(REPORT_SETTINGS).forEach(function (row) {
    if (names.indexOf(row[0].toLowerCase()) >= 0) return;
    last = sheet.getLastRow() + 1;
    sheet.getRange(last, 1, 1, 3).setValues([row]);
    names.push(row[0].toLowerCase());
  });
  return sheet;
}
function ensureReportSettings_() { return ensureSettings_(); }

/** Settings tab as { lowercase name: { row, value } }. */
function readSettingsTab_() {
  var map = {};
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
  if (!sheet || sheet.getLastRow() < 2) return map;
  sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getDisplayValues().forEach(function (r, i) {
    var name = String(r[0]).trim().toLowerCase();
    if (name && !map[name]) map[name] = { row: i + 2, value: String(r[1]).trim() };
  });
  return map;
}
function settingValue_(name) {
  var s = readSettingsTab_()[name];
  return s ? s.value : '';
}

/** Turns the Settings tab values into clean game settings. */
function cleanSettings_(raw) {
  var out = { length: 'Standard', ppq: 12, difficulty: 'Normal', rpp: 2, clock: 0, readAll: false };
  var len = String(raw.length || '').trim();
  var n = parseInt(len, 10);
  if (LENGTH_NAMES[len.toLowerCase()]) out.length = LENGTH_NAMES[len.toLowerCase()];
  else if (n >= 3 && n <= 25) out.length = String(n);
  out.ppq = { 'Quick': 6, 'Standard': 12, 'Full Period': 18 }[out.length] || Number(out.length);
  out.difficulty = DIFF_NAMES[String(raw.difficulty || '').trim().toLowerCase()] || 'Normal';
  var rpp = Number(raw.rpp);
  out.rpp = rpp === 1 || rpp === 3 ? rpp : 2;
  var clock = parseInt(raw.clock, 10);
  out.clock = clock === 15 || clock === 20 || clock === 30 ? clock : 0;
  out.readAll = yes_(raw.readAll);
  return out;
}

/** What the game may see about the settings (never the PIN itself). */
function publicSettings_() {
  var t = readSettingsTab_();
  function v(name) { return t[name] ? t[name].value : ''; }
  var s = cleanSettings_({
    length: v('game length'), difficulty: v('computer difficulty'), rpp: v('rating per skill point'),
    clock: v('play clock'), readAll: v('read aloud for everyone')
  });
  s.pinSet = !!v('teacher pin');
  return s;
}

function pinOk_(pin) {
  var real = settingValue_('teacher pin');
  return !!real && String(pin || '').trim() === real;
}

/** Gear icon: checks the Teacher PIN. */
function checkTeacherPin(pin) {
  if (!settingValue_('teacher pin')) return { ok: false, error: 'No Teacher PIN yet. Type one in the Settings tab of the class Sheet first.' };
  if (!pinOk_(pin)) return { ok: false, error: 'That PIN is not right.' };
  return { ok: true, settings: publicSettings_() };
}

/** Gear icon: saves the teacher settings to the Settings tab. */
function saveTeacherSettings(pin, s) {
  if (!pinOk_(pin)) return { ok: false, error: 'That PIN is not right.' };
  var clean = cleanSettings_(s || {});
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var sheet = ensureSettings_();
    var t = readSettingsTab_();
    var vals = {
      'game length': clean.length,
      'computer difficulty': clean.difficulty,
      'rating per skill point': String(clean.rpp),
      'play clock': clean.clock ? String(clean.clock) : 'Off',
      'read aloud for everyone': clean.readAll ? 'Yes' : 'No'
    };
    Object.keys(vals).forEach(function (name) { if (t[name]) sheet.getRange(t[name].row, 2).setValue(vals[name]); });
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  return { ok: true, settings: publicSettings_() };
}

/* =========================================================
   SETS: Set number | Set name | Question tab | Open?
   ========================================================= */
function readSets_() {
  var sets = [];
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sets');
  if (!sheet) return sets;
  var values = sheet.getDataRange().getDisplayValues();
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (row[1] === '' && row[2] === '') continue;
    if (!yes_(row[3])) continue;
    sets.push({
      number: Number(row[0]) || i,
      name: String(row[1] || row[2] || ''),
      questionTab: String(row[2] || '').trim()
    });
  }
  return sets;
}

/* =========================================================
   ROSTER
   School email | Student name | Class period | Read aloud | Extended time | Reduced choices | Notes | Backup code
   ========================================================= */
function readRoster_() {
  var map = {};
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Roster');
  if (!sheet) return map;
  var values = sheet.getDataRange().getDisplayValues();
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    var em = String(r[0] || '').trim().toLowerCase();
    if (!em) continue;
    map[em] = {
      email: em,
      name: String(r[1] || '').trim() || nameFromEmail_(em),
      period: String(r[2] || ''),
      readAloud: yes_(r[3]),
      extended: yes_(r[4]),
      reduced: yes_(r[5]),
      code: String(r[7] || '').trim().toUpperCase()
    };
  }
  return map;
}

/** What the game is allowed to see about a student (backup codes stay on the server). */
function publicStudent_(s) {
  return {
    onRoster: !!s.email,
    name: s.name || '',
    period: s.period || '',
    readAloud: !!s.readAloud,
    extended: !!s.extended,
    reduced: !!s.reduced
  };
}

function readStudent_(email) {
  var roster = readRoster_();
  var s = roster[String(email || '').trim().toLowerCase()];
  return s ? publicStudent_(s) : publicStudent_({});
}

function yes_(v) {
  if (v === true) return true;
  var t = String(v).trim().toLowerCase();
  return t === 'yes' || t === 'y' || t === 'true' || t === 'x';
}

/** A student who is not on the Roster (or has no class period) picks a period 1-8. */
function registerStudent(period) {
  var email = currentEmail_().trim().toLowerCase();
  if (!email) return { ok: false, error: 'Google did not send your school email. Ask your teacher for help.' };
  var p = Number(period);
  if (!(p >= 1 && p <= 8)) return { ok: false, error: 'Pick a class period from 1 to 8.' };
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var sheet = getOrMakeSheet_('Roster', ROSTER_HEADERS);
    var last = sheet.getLastRow();
    var emails = last > 1 ? sheet.getRange(2, 1, last - 1, 1).getValues() : [];
    var row = -1;
    for (var i = 0; i < emails.length; i++) {
      if (String(emails[i][0] || '').trim().toLowerCase() === email) { row = i + 2; break; }
    }
    if (row > 0) {
      sheet.getRange(row, 3).setValue(String(p));
      if (!String(sheet.getRange(row, 2).getValue() || '').trim()) sheet.getRange(row, 2).setValue(nameFromEmail_(email));
    } else {
      row = last + 1;
      for (var k = 0; k < emails.length; k++) {
        if (!String(emails[k][0] || '').trim()) { row = k + 2; break; }
      }
      sheet.getRange(row, 1, 1, 3).setValues([[email, nameFromEmail_(email), String(p)]]);
      sheet.getRange(row, 8).setValue(newUniqueCode_(sheet));
    }
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  return { ok: true, student: readStudent_(email) };
}

/** firstname.lastname@brazosportisd.net -> "Firstname Lastname" (numbers dropped) */
function nameFromEmail_(email) {
  var local = String(email || '').split('@')[0].replace(/[0-9]+/g, '');
  return local.split(/[._-]+/).filter(String).map(function (w) {
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ');
}

function newUniqueCode_(sheet) {
  var used = {};
  var last = sheet.getLastRow();
  if (last > 1) sheet.getRange(2, 8, last - 1, 1).getValues().forEach(function (c) {
    var t = String(c[0] || '').trim().toUpperCase(); if (t) used[t] = true;
  });
  var c;
  do { c = randomCode_(); } while (used[c]);
  return c;
}

/* =========================================================
   BACKUP CODES
   ========================================================= */
function redeemBackupCode(code) {
  code = String(code || '').trim().toUpperCase();
  if (!code) return { ok: false, error: 'Type your code first.' };
  var email = currentEmail_().trim().toLowerCase();
  var roster = readRoster_();
  var match = null;
  Object.keys(roster).forEach(function (em) {
    if (roster[em].code && roster[em].code === code) match = roster[em];
  });
  if (!match) return { ok: false, error: 'That code was not found. Check it with your teacher.' };
  if (email && email !== match.email) {
    return { ok: false, error: 'That code belongs to a different student. Codes only work for the student they were made for.' };
  }
  return { ok: true, email: match.email, student: publicStudent_(match) };
}

/** Teacher menu: Huddle Up > Make backup codes. Fills empty cells in Roster column H. */
function makeBackupCodes() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Roster');
  if (!sheet || sheet.getLastRow() < 2) { toast_('Add students to the Roster tab first.'); return; }
  var n = sheet.getLastRow() - 1;
  var emails = sheet.getRange(2, 1, n, 1).getValues();
  var codeRange = sheet.getRange(2, 8, n, 1);
  var codes = codeRange.getValues();
  var used = {};
  codes.forEach(function (c) { var t = String(c[0] || '').trim().toUpperCase(); if (t) used[t] = true; });
  var made = 0;
  for (var i = 0; i < n; i++) {
    if (String(emails[i][0] || '').trim() && !String(codes[i][0] || '').trim()) {
      var c;
      do { c = randomCode_(); } while (used[c]);
      used[c] = true;
      codes[i][0] = c;
      made++;
    }
  }
  codeRange.setValues(codes);
  toast_(made ? made + ' backup codes made in the Roster tab (column H).' : 'Every student already has a backup code.');
}

function randomCode_() {
  var s = '';
  for (var i = 0; i < 6; i++) s += CODE_LETTERS.charAt(Math.floor(Math.random() * CODE_LETTERS.length));
  return s;
}

/* =========================================================
   QUESTIONS (same columns as a Studio 68 question tab)
   Question | Correct answer | Wrong 1 | Wrong 2 | Wrong 3 | Wrong 4 (not used) | Resource tag | TEKS
   ========================================================= */
function getQuestions(tabName) {
  tabName = String(tabName || '').trim();
  if (!tabName) return { tab: '', questions: [], error: 'No question tab is set for this set in the Sets tab.' };
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tabName);
  if (!sheet) return { tab: tabName, questions: [], error: 'The question tab "' + tabName + '" was not found.' };
  var values = sheet.getDataRange().getDisplayValues();
  var list = [];
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    var q = String(r[0] || '').trim();
    var a = String(r[1] || '').trim();
    if (!q || !a) continue;
    var w = [String(r[2] || '').trim(), String(r[3] || '').trim(), String(r[4] || '').trim()].filter(String);
    if (!w.length) continue;   // needs at least one wrong answer
    list.push({ q: q, a: a, w: w, tag: String(r[6] || '').trim().toLowerCase(), teks: String(r[7] || '').trim() });
  }
  if (!list.length) return { tab: tabName, questions: [], error: 'The question tab "' + tabName + '" has no questions yet.' };
  return { tab: tabName, questions: list, error: '' };
}

/* =========================================================
   RESULTS LOGGING (the game sends answers in small batches)
   ========================================================= */
function logAnswers(rows) {
  if (!rows || !rows.length) return 0;
  var roster = readRoster_();
  var data = rows.map(function (r) {
    var email = who_(r.email);
    var student = roster[email] || {};
    return [
      new Date(Number(r.time) || Date.now()), email, student.period || '',
      r.set || '', r.tab || '', r.question || '', r.teks || '',
      r.result || '', r.accom || '', r.guess ? 'Yes' : '', r.event || ''
    ];
  });
  appendRows_('Results', RESULTS_HEADERS, data);
  return data.length;
}

/* =========================================================
   GAMES TAB (one row per game)
   Time | Player 1 | Player 2 (or Computer) | Class period | Set | Mode | Difficulty | Game length | Score | Winner | Finished?
   Head-to-Head: both computers send the game; only the first one is written.
   ========================================================= */
function logGame(g, email) {
  if (!g) return { ok: false };
  var roster = readRoster_();
  var me = who_(email);
  var p1 = me, p2 = 'Computer', mode = 'Solo', diff = String(g.difficulty || '');
  if (g.code) {
    mode = 'Head-to-Head'; diff = '';
    var cache = h2hCache_(), code = h2hCode_(g.code), lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      if (cache.get('h2h_' + code + '_logged')) return { ok: true, duplicate: true };
      cache.put('h2h_' + code + '_logged', '1', h2hSecs_());
    } finally {
      lock.releaseLock();
    }
    var meta = parse_(cache.get('h2h_' + code), {});
    var guest = cache.get('h2h_' + code + '_guest');
    var host = String(meta.host || '');
    guest = guest && guest !== '1' ? String(guest) : '';
    if (g.side === 'away') { p1 = host || '(other coach)'; p2 = me || guest; }
    else { p1 = me || host; p2 = guest || '(other coach)'; }
  }
  var home = Number(g.home) || 0, away = Number(g.away) || 0, finished = !!g.finished;
  var winner = '';
  if (finished) winner = home > away ? p1 : away > home ? p2 : 'Tie';
  var periods = [p1, p2].map(function (e) { return (roster[e] || {}).period || ''; }).filter(String);
  if (periods.length === 2 && periods[0] === periods[1]) periods.pop();
  appendRows_('Games', GAMES_HEADERS, [[
    new Date(), p1, p2, periods.join(' / '), String(g.set || ''), mode, diff, String(g.length || ''),
    'Pelicans ' + home + ', Comets ' + away + (finished ? '' : ' (after ' + (Number(g.plays) || 0) + ' plays)'),
    winner, finished ? 'Yes' : 'No'
  ]]);
  return { ok: true };
}

function appendRows_(name, headers, data) {
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var sheet = getOrMakeSheet_(name, headers);
    sheet.getRange(sheet.getLastRow() + 1, 1, data.length, headers.length).setValues(data);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
}

function getOrMakeSheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function parse_(text, fallback) {
  try { var v = JSON.parse(String(text || '')); return v == null ? fallback : v; } catch (err) { return fallback; }
}

/* =========================================================
   TEACHER REPORTS (menu: Huddle Up > Update reports)
   ========================================================= */
function updateReports() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var results = ss.getSheetByName('Results');
  if (!results || results.getLastRow() < 2) {
    toast_('No answers in the Results tab yet.');
    return;
  }
  var roster = readRoster_();
  var goals = readGoals_();
  var games = gamesByStudent_(null);
  var tz = ss.getSpreadsheetTimeZone();
  var values = results.getRange(2, 1, results.getLastRow() - 1, RESULTS_HEADERS.length).getValues();

  var students = {};   // email -> summary info
  var teksRows = {};   // email|teks -> progress info
  var missed = {};     // question -> {wrong, total}

  values.forEach(function (r) {
    var email = String(r[R_EMAIL] || '').trim().toLowerCase();
    var question = String(r[R_QUESTION] || '');
    if (!email || !question || question === 'CONNECTION TEST') return;
    var period = String(r[R_PERIOD] || '');
    var s = students[email] || (students[email] = { email: email, period: period, answered: 0, scored: 0, correct: 0 });
    if (period) s.period = period;

    var right = String(r[R_RESULT]) === 'Right';
    var guess = String(r[R_GUESS]) === 'Yes';
    s.answered++;
    if (!guess) { s.scored++; if (right) s.correct++; }

    if (!guess) {
      var m = missed[question] || (missed[question] = { wrong: 0, total: 0 });
      m.total++;
      if (!right) m.wrong++;
    }

    var when = r[R_TIME] instanceof Date ? r[R_TIME] : new Date(r[R_TIME]);
    var day = isNaN(when.getTime()) ? '' : Utilities.formatDate(when, tz, 'yyyy-MM-dd');
    var accom = String(r[R_ACCOM] || '').trim();
    var codes = String(r[R_TEKS] || '').split(',').map(function (c) { return c.trim(); }).filter(String);
    if (!codes.length) codes = ['(no TEKS)'];

    codes.forEach(function (code) {
      var key = email + '|' + code;
      var p = teksRows[key] || (teksRows[key] = {
        email: email, teks: code, answered: 0, scored: 0, correct: 0, guesses: 0, days: {}, accom: {}
      });
      p.answered++;
      if (guess) p.guesses++;
      else { p.scored++; if (right) p.correct++; }
      if (day) {
        var d = p.days[day] || (p.days[day] = { scored: 0, correct: 0 });
        if (!guess) { d.scored++; if (right) d.correct++; }
      }
      if (accom) accom.split(',').forEach(function (a) { a = a.trim(); if (a) p.accom[a] = true; });
    });
  });

  // ---- Summary tab ----
  var mostMissed = Object.keys(missed)
    .filter(function (q) { return missed[q].wrong > 0; })
    .sort(function (a, b) { return missed[b].wrong - missed[a].wrong || missed[b].total - missed[a].total; })
    .slice(0, 10)
    .map(function (q) { return q + '  (missed ' + missed[q].wrong + ' of ' + missed[q].total + ')'; });

  var sumRows = Object.keys(students).map(function (em) {
    var s = students[em];
    var info = roster[em] || {};
    return [em, info.name || '', info.period || s.period || '', s.answered,
      s.scored ? s.correct / s.scored : '', games[em] ? games[em].played : 0, ''];
  });
  sumRows.sort(sortByPeriodName_);
  for (var i = 0; i < mostMissed.length; i++) {
    if (!sumRows[i]) sumRows.push(['', '', '', '', '', '', '']);
    sumRows[i][6] = mostMissed[i];
  }
  writeTab_('Summary', SUMMARY_HEADERS, sumRows, [5]);

  // ---- Progress Report tab ----
  var progRows = [];
  Object.keys(teksRows).forEach(function (key) {
    var p = teksRows[key];
    var goalList = goals[p.email];
    if (goalList && goalList.length && goalList.indexOf(p.teks) < 0) return;   // only IEP goal TEKS when set
    var info = roster[p.email] || {};
    var dayKeys = Object.keys(p.days).sort();
    var first = dayKeys[0], last = dayKeys[dayKeys.length - 1];
    function pct(d) { return d && d.scored ? d.correct / d.scored : ''; }
    progRows.push([
      p.email, info.name || '', info.period || (students[p.email] && students[p.email].period) || '', p.teks,
      p.answered, p.scored ? p.correct / p.scored : '', p.guesses,
      first || '', pct(p.days[first]), last || '', pct(p.days[last]),
      Object.keys(p.accom).join(', ')
    ]);
  });
  progRows.sort(function (a, b) {
    return sortByPeriodName_(a, b) || String(a[3]).localeCompare(String(b[3]));
  });
  writeTab_('Progress Report', PROGRESS_HEADERS, progRows, [6, 9, 11]);

  var overview = buildClassOverview_();
  refreshStudentPicker_();

  toast_('Reports updated: ' + sumRows.length + ' summary rows, ' + progRows.length + ' progress rows, ' +
    overview.periods + ' class periods on Class Overview.' + (overview.problem ? ' ' + overview.problem : ''));
}

/* =========================================================
   REPORT DATES (Settings tab: "Report start date" and "Report end date")
   Blank means all dates. Used by Class Overview and Student Report only.
   ========================================================= */
function reportDates_() {
  ensureSettings_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tz = ss.getSpreadsheetTimeZone();
  var sheet = ss.getSheetByName('Settings');
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  var out = { start: null, end: null, label: 'All dates', problem: '' };
  values.forEach(function (r) {
    var name = String(r[0]).trim().toLowerCase();
    if (name !== 'report start date' && name !== 'report end date') return;
    if (r[1] === '' || r[1] === null) return;
    var d = r[1] instanceof Date ? new Date(r[1].getTime()) : new Date(String(r[1]));
    if (isNaN(d.getTime())) { out.problem = 'The ' + r[0] + ' in Settings is not a date, so it was ignored.'; return; }
    if (name === 'report start date') { d.setHours(0, 0, 0, 0); out.start = d; }
    else { d.setHours(23, 59, 59, 999); out.end = d; }
  });
  function show(d) { return Utilities.formatDate(d, tz, 'M/d/yyyy'); }
  if (out.start && out.end) out.label = show(out.start) + ' to ' + show(out.end);
  else if (out.start) out.label = show(out.start) + ' to today';
  else if (out.end) out.label = 'Through ' + show(out.end);
  return out;
}

function inDates_(when, dates) {
  if (!dates || (!dates.start && !dates.end)) return true;
  if (isNaN(when.getTime())) return false;
  if (dates.start && when < dates.start) return false;
  if (dates.end && when > dates.end) return false;
  return true;
}

/** Results rows inside the report dates, as simple objects. */
function readResultsInDates_(dates) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tz = ss.getSpreadsheetTimeZone();
  var sheet = ss.getSheetByName('Results');
  var out = [];
  if (!sheet || sheet.getLastRow() < 2) return out;
  sheet.getRange(2, 1, sheet.getLastRow() - 1, RESULTS_HEADERS.length).getValues().forEach(function (r) {
    var email = String(r[R_EMAIL] || '').trim().toLowerCase();
    var question = String(r[R_QUESTION] || '');
    if (!email || !question || question === 'CONNECTION TEST') return;
    var when = r[R_TIME] instanceof Date ? r[R_TIME] : new Date(r[R_TIME]);
    if (!inDates_(when, dates)) return;
    out.push({
      email: email,
      period: String(r[R_PERIOD] || ''),
      day: isNaN(when.getTime()) ? '' : Utilities.formatDate(when, tz, 'yyyy-MM-dd'),
      question: question,
      teks: String(r[R_TEKS] || '').split(',').map(function (c) { return c.trim(); }).filter(String),
      right: String(r[R_RESULT]) === 'Right',
      accom: String(r[R_ACCOM] || '').split(',').map(function (a) { return a.trim(); }).filter(String),
      guess: String(r[R_GUESS]) === 'Yes'
    });
  });
  return out;
}

/** Games tab counts per student: { email: {played, finished, wins, losses, ties, solo, h2h, diffs{}} } */
function gamesByStudent_(dates) {
  var map = {};
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Games');
  if (!sheet || sheet.getLastRow() < 2) return map;
  sheet.getRange(2, 1, sheet.getLastRow() - 1, GAMES_HEADERS.length).getValues().forEach(function (r) {
    var when = r[0] instanceof Date ? r[0] : new Date(r[0]);
    if (!inDates_(when, dates)) return;
    var finished = yes_(r[10]), winner = String(r[9] || '').trim().toLowerCase();
    [r[1], r[2]].forEach(function (e) {
      e = String(e || '').trim().toLowerCase();
      if (!e || e === 'computer' || e.charAt(0) === '(') return;
      var g = map[e] || (map[e] = { played: 0, finished: 0, wins: 0, losses: 0, ties: 0, solo: 0, h2h: 0, diffs: {} });
      g.played++;
      if (String(r[5]) === 'Head-to-Head') g.h2h++; else { g.solo++; if (r[6]) g.diffs[String(r[6])] = true; }
      if (!finished) return;
      g.finished++;
      if (winner === 'tie') g.ties++; else if (winner === e) g.wins++; else g.losses++;
    });
  });
  return map;
}

function pctText_(correct, scored) {
  return scored ? Math.round(100 * correct / scored) + '%' : '-';
}

function niceDay_(isoDay) {   // yyyy-MM-dd -> M/d/yyyy
  var p = String(isoDay || '').split('-');
  return p.length === 3 ? Number(p[1]) + '/' + Number(p[2]) + '/' + p[0] : String(isoDay || '');
}

function byPeriod_(a, b) {
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

/** Clears a report tab from a row down (values, formats, and dropdowns). */
function clearFromRow_(sheet, row) {
  var rows = sheet.getMaxRows() - row + 1;
  if (rows > 0) sheet.getRange(row, 1, rows, sheet.getMaxColumns()).clear().clearDataValidations();
}

/** Writes a block of rows (all padded to the same width) starting at a row. */
function writeBlock_(sheet, row, rows, width) {
  if (!rows.length) return;
  var padded = rows.map(function (r) {
    var out = r.slice(0, width);
    while (out.length < width) out.push('');
    return out;
  });
  sheet.getRange(row, 1, padded.length, width).setValues(padded);
}

/* =========================================================
   CLASS OVERVIEW (rebuilt by Huddle Up > Update reports)
   One block per class period.
   ========================================================= */
var OVERVIEW_WIDTH = 6;

function buildClassOverview_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tz = ss.getSpreadsheetTimeZone();
  var dates = reportDates_();
  var roster = readRoster_();
  var results = readResultsInDates_(dates);
  var games = gamesByStudent_(dates);

  var periods = {};   // period -> info
  function per(p) {
    p = String(p || '(no period)');
    return periods[p] || (periods[p] = { name: p, roster: [], students: {}, answered: 0, scored: 0, correct: 0, missed: {} });
  }
  Object.keys(roster).forEach(function (em) { per(roster[em].period).roster.push(em); });

  results.forEach(function (r) {
    var info = roster[r.email];
    var P = per(info ? info.period : r.period);
    var s = P.students[r.email] || (P.students[r.email] = { answered: 0, guesses: 0 });
    s.answered++;
    P.answered++;
    if (r.guess) { s.guesses++; return; }
    P.scored++;
    if (r.right) P.correct++;
    var m = P.missed[r.question] || (P.missed[r.question] = { wrong: 0, total: 0 });
    m.total++;
    if (!r.right) m.wrong++;
  });

  function nameOf(em) { return roster[em] ? roster[em].name : nameFromEmail_(em); }
  function byName(a, b) { return nameOf(a).localeCompare(nameOf(b)); }

  var rows = [], bold = [], shade = [];
  rows.push(['HUDDLE UP CLASS OVERVIEW', '', 'Dates: ' + dates.label, '', 'Updated: ' +
    Utilities.formatDate(new Date(), tz, 'M/d/yyyy h:mm a')]);
  bold.push(1);
  rows.push(['Guess-flagged answers are left out of % correct and most-missed questions.']);
  rows.push([]);

  Object.keys(periods).sort(byPeriod_).forEach(function (p) {
    var P = periods[p];
    var played = Object.keys(P.students);
    var notPlayed = P.roster.filter(function (em) { return !P.students[em]; }).sort(byName);
    var gameCount = 0;
    played.concat(notPlayed).forEach(function (em) { if (games[em]) gameCount += games[em].played; });
    rows.push(['PERIOD ' + p, 'Roster: ' + P.roster.length, 'Played: ' + played.length,
      'Not played: ' + notPlayed.length, 'Games: ' + gameCount]);
    bold.push(rows.length); shade.push(rows.length);
    rows.push(['Not played yet:', notPlayed.length ? notPlayed.map(nameOf).join(', ') : 'Everyone has played']);
    rows.push(['Class % correct (guesses left out):', pctText_(P.correct, P.scored),
      'Questions answered:', P.answered]);
    var flagged = played.filter(function (em) { return P.students[em].guesses > 0; })
      .sort(function (a, b) { return P.students[b].guesses - P.students[a].guesses || byName(a, b); });
    rows.push(['Guess-flagged answers:', flagged.length ? flagged.map(function (em) {
      return nameOf(em) + ' (' + P.students[em].guesses + ')';
    }).join(', ') : 'None']);
    var top = Object.keys(P.missed)
      .filter(function (q) { return P.missed[q].wrong > 0; })
      .sort(function (a, b) { return P.missed[b].wrong - P.missed[a].wrong || P.missed[b].total - P.missed[a].total; })
      .slice(0, 5);
    rows.push(['Most-missed questions:', top.length ? '' : 'None yet']);
    bold.push(rows.length);
    top.forEach(function (q, i) {
      rows.push([(i + 1) + ')', q + '  (missed ' + P.missed[q].wrong + ' of ' + P.missed[q].total + ')']);
    });
    rows.push([]);
  });

  var sheet = ss.getSheetByName('Class Overview') || ss.insertSheet('Class Overview');
  clearFromRow_(sheet, 1);
  writeBlock_(sheet, 1, rows, OVERVIEW_WIDTH);
  sheet.getRange(1, 1).setFontSize(14);
  bold.forEach(function (r) { sheet.getRange(r, 1, 1, OVERVIEW_WIDTH).setFontWeight('bold'); });
  shade.forEach(function (r) { sheet.getRange(r, 1, 1, OVERVIEW_WIDTH).setBackground('#d9e2f3'); });
  sheet.setColumnWidth(1, 240);
  return { periods: Object.keys(periods).length, problem: dates.problem };
}

/* =========================================================
   STUDENT REPORT (menu: Huddle Up > Make student report)
   Pick a student in cell B1, then run the menu item. One printable page.
   ========================================================= */
var REPORT_WIDTH = 6;

/** Dropdown labels like "2 - Jane Doe", sorted by period then name. Returns {labels, byLabel}. */
function studentChoices_() {
  var roster = readRoster_();
  var list = Object.keys(roster).map(function (em) { return roster[em]; });
  list.sort(function (a, b) { return byPeriod_(a.period, b.period) || a.name.localeCompare(b.name); });
  var byLabel = {}, labels = [];
  list.forEach(function (s) {
    var label = (s.period || '?') + ' - ' + s.name;
    if (byLabel[label]) label += ' (' + s.email.split('@')[0] + ')';
    byLabel[label] = s.email;
    labels.push(label);
  });
  return { labels: labels, byLabel: byLabel };
}

/** Makes the Student Report tab (if needed) and refreshes its dropdown in B1. */
function refreshStudentPicker_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Student Report') || ss.insertSheet('Student Report');
  var choices = studentChoices_();
  sheet.getRange(1, 1, 1, 3).setValues([['Pick a student:', sheet.getRange(1, 2).getValue(),
    'Then Huddle Up > Make student report']]);
  sheet.getRange(1, 1).setFontWeight('bold');
  if (choices.labels.length) {
    var rule = SpreadsheetApp.newDataValidation().requireValueInList(choices.labels, true)
      .setAllowInvalid(true).build();
    sheet.getRange(1, 2).setDataValidation(rule).setBackground('#fff2cc');
  }
  [190, 90, 170, 90, 190, 90].forEach(function (w, i) { sheet.setColumnWidth(i + 1, w); });
  return { sheet: sheet, choices: choices };
}

function makeStudentReport() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tz = ss.getSpreadsheetTimeZone();
  var pick = refreshStudentPicker_();
  var sheet = pick.sheet;
  var label = String(sheet.getRange(1, 2).getValue() || '').trim();
  var email = pick.choices.byLabel[label];
  if (!email) {
    clearFromRow_(sheet, 2);
    toast_(label ? 'That name is not on the Roster list. Pick a student from the dropdown in B1, then run Make student report again.'
                 : 'Pick a student from the dropdown in B1, then run Make student report again.');
    return { ok: false };
  }
  var roster = readRoster_();
  var s = roster[email];
  var dates = reportDates_();
  var mine = readResultsInDates_(dates).filter(function (r) { return r.email === email; });
  var goals = readGoals_()[email] || [];
  var g = gamesByStudent_(dates)[email] || { played: 0, finished: 0, wins: 0, losses: 0, ties: 0, solo: 0, h2h: 0, diffs: {} };

  // ---- Totals and per-TEKS numbers ----
  var t = { answered: 0, scored: 0, correct: 0, guesses: 0, days: {}, accom: {}, guessDays: {} };
  var teks = {};
  mine.forEach(function (r) {
    t.answered++;
    if (r.guess) { t.guesses++; if (r.day) t.guessDays[r.day] = (t.guessDays[r.day] || 0) + 1; }
    else { t.scored++; if (r.right) t.correct++; }
    if (r.day) t.days[r.day] = true;
    r.accom.forEach(function (a) { t.accom[a] = true; });
    (r.teks.length ? r.teks : ['(no TEKS)']).forEach(function (code) {
      var k = teks[code] || (teks[code] = { answered: 0, scored: 0, correct: 0, guesses: 0, days: {} });
      k.answered++;
      if (r.guess) { k.guesses++; return; }
      k.scored++;
      if (r.right) k.correct++;
      if (r.day) {
        var d = k.days[r.day] || (k.days[r.day] = { scored: 0, correct: 0 });
        d.scored++;
        if (r.right) d.correct++;
      }
    });
  });

  // ---- Build the page ----
  var rosterAccom = [];
  if (s.readAloud) rosterAccom.push('Read aloud');
  if (s.extended) rosterAccom.push('Extended time');
  if (s.reduced) rosterAccom.push('Reduced choices');

  var rows = [], bold = [], shade = [];
  function add(r) { rows.push(r || []); return rows.length; }
  function heading(text) { var n = add([text]); bold.push(n); shade.push(n); }

  bold.push(add(['HUDDLE UP STUDENT REPORT', '', '', '', 'Dates: ' + dates.label]));
  var title = rows.length;
  add(['Name: ' + s.name, '', 'Class period: ' + (s.period || '-'), '',
    'Report made: ' + Utilities.formatDate(new Date(), tz, 'M/d/yyyy')]);
  add(['Accommodations on Roster: ' + (rosterAccom.length ? rosterAccom.join(', ') : 'None')]);
  add();
  heading('TOTALS');
  add(['Questions answered', t.answered, '% correct (guesses left out)', pctText_(t.correct, t.scored),
    'Guess-flagged answers', t.guesses]);
  add(['Days played', Object.keys(t.days).length, 'Accommodations active',
    Object.keys(t.accom).length ? Object.keys(t.accom).join(', ') : 'None']);
  add();

  heading('IEP GOAL TEKS PROGRESS (from the Goals tab)');
  if (!goals.length) {
    add(['No IEP goal TEKS on the Goals tab for this student.']);
  } else {
    bold.push(add(['TEKS', 'Answered', '% correct', 'First attempt', 'Latest attempt', 'Change']));
    goals.forEach(function (code) {
      var k = teks[code];
      if (!k || !k.answered) { add([code, 0, '-', 'Not practiced yet', '', '']); return; }
      var dayKeys = Object.keys(k.days).sort();
      var f = k.days[dayKeys[0]], l = k.days[dayKeys[dayKeys.length - 1]];
      var change = '-';
      if (dayKeys.length > 1) {
        var pts = Math.round(100 * l.correct / l.scored) - Math.round(100 * f.correct / f.scored);
        change = (pts > 0 ? '+' : '') + pts + ' points';
      } else if (dayKeys.length === 1) change = 'One day only';
      add([code, k.answered, pctText_(k.correct, k.scored),
        dayKeys.length ? niceDay_(dayKeys[0]) + ': ' + pctText_(f.correct, f.scored) : '-',
        dayKeys.length ? niceDay_(dayKeys[dayKeys.length - 1]) + ': ' + pctText_(l.correct, l.scored) : '-',
        change]);
    });
  }
  add();

  heading('ALL TEKS PRACTICED');
  var codes = Object.keys(teks).sort(function (a, b) { return a.localeCompare(b, undefined, { numeric: true }); });
  if (!codes.length) add(['No answers in these dates.']);
  else {
    bold.push(add(['TEKS', 'Answered', '% correct', 'Guess-flagged']));
    codes.forEach(function (code) {
      var k = teks[code];
      add([code, k.answered, pctText_(k.correct, k.scored), k.guesses]);
    });
  }
  add();

  heading('GUESS FLAG DATES');
  var gd = Object.keys(t.guessDays).sort();
  add([gd.length ? gd.map(function (d) { return niceDay_(d) + ' (' + t.guessDays[d] + ')'; }).join(', ') : 'None']);
  add();

  heading('GAMES');
  add(['Games played', g.played, 'Finished', g.finished, 'Wins / losses / ties', g.wins + ' / ' + g.losses + ' / ' + g.ties]);
  add(['Solo games', g.solo, 'Head-to-Head games', g.h2h, 'Computer levels played',
    Object.keys(g.diffs).length ? Object.keys(g.diffs).join(', ') : '-']);

  clearFromRow_(sheet, 2);
  writeBlock_(sheet, 3, rows, REPORT_WIDTH);
  sheet.getRange(2 + title, 1).setFontSize(14);
  bold.forEach(function (r) { sheet.getRange(2 + r, 1, 1, REPORT_WIDTH).setFontWeight('bold'); });
  shade.forEach(function (r) { sheet.getRange(2 + r, 1, 1, REPORT_WIDTH).setBackground('#d9e2f3'); });
  sheet.getRange(3, 1, rows.length, REPORT_WIDTH).setHorizontalAlignment('left');
  ss.setActiveSheet(sheet);
  toast_('Student report made for ' + s.name + (dates.problem ? '. ' + dates.problem : '.') +
    ' To print: File > Print, Portrait, Fit to width.');
  return { ok: true, rows: rows.length };
}

function sortByPeriodName_(a, b) {
  return String(a[2]).localeCompare(String(b[2]), undefined, { numeric: true }) ||
         String(a[1] || a[0]).localeCompare(String(b[1] || b[0]));
}

/** Goals: School email | Student name | IEP goal TEKS (commas) | Notes */
function readGoals_() {
  var map = {};
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Goals');
  if (!sheet || sheet.getLastRow() < 2) return map;
  sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getDisplayValues().forEach(function (r) {
    var em = String(r[0] || '').trim().toLowerCase();
    if (!em) return;
    var codes = String(r[2] || '').split(',').map(function (c) { return c.trim(); }).filter(String);
    map[em] = (map[em] || []).concat(codes);
  });
  return map;
}

function writeTab_(name, headers, rows, percentCols) {
  var sheet = getOrMakeSheet_(name, headers);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  var last = sheet.getLastRow();
  if (last > 1) sheet.getRange(2, 1, last - 1, Math.max(headers.length, sheet.getLastColumn())).clearContent();
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    percentCols.forEach(function (c) {
      sheet.getRange(2, c, rows.length, 1).setNumberFormat('0%');
    });
  }
}

function toast_(msg) {
  try { SpreadsheetApp.getActiveSpreadsheet().toast(msg, 'Huddle Up', 6); } catch (e) {}
}

/* =========================================================
   HEAD-TO-HEAD (two computers)
   Live game info stays in Apps Script's fast temporary storage (CacheService) for up to 6 hours.
   Only the finished game goes to the Sheet (Games tab, through logGame).
   Keys:  h2h_CODE          game info (settings, random seed, host email)
          h2h_CODE_guest    the second coach's email (or 1) once he or she joins
          h2h_CODE_SIDE_N   message number N sent by side 'home' or 'away'
          h2h_CODE_logged   set once the game is written to the Games tab
   Each side only writes its own message keys, so two coaches never overwrite each other.
   ========================================================= */
var H2H_HOURS = 6;
var H2H_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';   // no I or O

function h2hCache_() { return CacheService.getScriptCache(); }
function h2hSecs_() { return H2H_HOURS * 3600; }
function h2hCode_(code) { return String(code || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4); }

/** Head-to-Head button: makes a new 4-letter game code. */
function h2hCreate(settings, email) {
  var cache = h2hCache_(), lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var code, tries = 0;
    do {
      code = '';
      for (var i = 0; i < 4; i++) code += H2H_LETTERS.charAt(Math.floor(Math.random() * H2H_LETTERS.length));
      tries++;
    } while (cache.get('h2h_' + code) && tries < 50);
    var seed = String(Math.floor(Math.random() * 1e9));
    cache.put('h2h_' + code, JSON.stringify({ settings: settings || {}, seed: seed, t: Date.now(), host: who_(email) }), h2hSecs_());
    return { code: code, seed: seed };
  } finally {
    lock.releaseLock();
  }
}

/** Join a Game button: checks the code and marks the game as full. */
function h2hJoin(code, email) {
  code = h2hCode_(code);
  var cache = h2hCache_(), lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var meta = cache.get('h2h_' + code);
    if (!meta) return { ok: false, msg: 'No game with that code. Check the code with the other coach.' };
    if (cache.get('h2h_' + code + '_guest')) return { ok: false, msg: 'That game already has two coaches.' };
    cache.put('h2h_' + code + '_guest', who_(email) || '1', h2hSecs_());
    var m = JSON.parse(meta);
    return { ok: true, code: code, seed: m.seed, settings: m.settings };
  } finally {
    lock.releaseLock();
  }
}

/** Saves one message (a play call, a 4th down choice, or leaving the game). */
function h2hSend(code, side, n, json) {
  code = h2hCode_(code);
  side = side === 'away' ? 'away' : 'home';
  if (String(json).length > 90000) throw new Error('Message too large');
  h2hCache_().put('h2h_' + code + '_' + side + '_' + Number(n), String(json), h2hSecs_());
  return true;
}

/** Called every 1 to 5 seconds by each computer: new messages from the other coach since message number "since". */
function h2hPoll(code, side, since) {
  code = h2hCode_(code);
  var opp = side === 'away' ? 'home' : 'away', start = Number(since) || 0, keys = [];
  for (var n = start; n < start + 30; n++) keys.push('h2h_' + code + '_' + opp + '_' + n);
  keys.push('h2h_' + code + '_guest');
  var got = h2hCache_().getAll(keys), msgs = [];
  for (var i = 0; i < 30; i++) {
    var v = got[keys[i]];
    if (v == null) break;
    msgs.push(v);
  }
  return { guest: !!got['h2h_' + code + '_guest'], msgs: msgs };
}

/* =========================================================
   SAMPLE QUESTION TAB (made by "Set up tabs"; fill in the TEKS column with current codes)
   Question | Correct answer | Wrong 1 | Wrong 2 | Wrong 3 | Wrong 4 (not used) | Resource tag | TEKS
   ========================================================= */
var SAMPLE_QUESTIONS = [
  ['What event in October 1929 helped start the Great Depression?', 'The stock market crash', 'The Dust Bowl', 'The Bonus Army march', 'The New Deal', '', '', ''],
  ['What were Hoovervilles?', 'Shantytowns built by homeless people', 'Government housing projects', 'Farm co-ops in the Midwest', 'Factory towns owned by banks', '', '', ''],
  ['What caused the Dust Bowl?', 'Drought and poor farming methods', 'Flooding of the Mississippi River', 'Too much rain on the Plains', 'A swarm of locusts', '', '', ''],
  ['Which president created the New Deal?', 'Franklin D. Roosevelt', 'Herbert Hoover', 'Calvin Coolidge', 'Harry Truman', '', '', ''],
  ['What did the Civilian Conservation Corps (CCC) do?', 'Gave young men jobs on conservation projects', 'Insured bank deposits', 'Regulated the stock market', 'Paid farmers to grow more crops', '', '', ''],
  ['What does the FDIC do?', 'Insures bank deposits', 'Builds dams and power plants', 'Hires artists and writers', 'Sets tariffs on imports', '', '', ''],
  ['What did buying stock "on margin" mean?', 'Buying stock with borrowed money', 'Buying stock with cash only', 'Selling stock for less than it cost', 'Buying only government bonds', '', '', ''],
  ['What did the Social Security Act (1935) create?', 'Pensions for older Americans', 'A national bank', 'A military draft', 'A lower voting age', '', '', ''],
  ['Why did many voters turn against Hoover?', 'They felt he did too little to help struggling people', 'He started a war in Europe', 'He ended Prohibition', 'He raised taxes on farmers only', '', '', ''],
  ['Who were the "Okies"?', 'Farm families who moved west to escape the Dust Bowl', 'New York bankers who lost everything', 'World War I veterans', 'Union leaders in Detroit', '', '', ''],
  ['What was the Bonus Army?', 'World War I veterans who marched on Washington for early bonus pay', 'A New Deal jobs program', 'Soldiers sent to guard banks', 'Farmers who refused to sell crops', '', '', ''],
  ['What did the Tennessee Valley Authority (TVA) build?', 'Dams that brought electricity and flood control to the South', 'Highways across the Great Plains', 'Banks in rural towns', 'Housing for city workers', '', '', '']
];
