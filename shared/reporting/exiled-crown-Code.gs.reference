/**
 * THE EXILED CROWN - Castle Builder Review Game
 * Code.gs  |  Build 6: loads the game page from GitHub (live branch for students, ?test=1 for main)
 *
 * - Serves the game page and its startup data (student, Missions tab, art)
 * - Reads the Roster tab: accommodations unlock Sage, Ranger, or Champion
 * - Backup codes: teacher menu makes one code per student; a code only works
 *   for the student it was made for
 * - Sends the game the questions from a mission's question tab
 * - Writes every answer to the Results tab
 * - Teacher menu "Castle Game > Update reports" rebuilds Summary and Progress Report
 * - Build 7: Saves tab (castle carry-over between missions) and "New campaign" menu item
 */

// Art is stored in the public GitHub repo. The game tries the first address,
// then the second one if a school filter blocks the first.
var ART_BASE_URLS = [
  'https://cdn.jsdelivr.net/gh/jimmaoscott-lang/castlebuildermapsanditems@main/',
  'https://raw.githubusercontent.com/jimmaoscott-lang/castlebuildermapsanditems/main/'
];

var GAME_VERSION = 'Build 7: Campaign saves';

// The game page (Index.html) loads straight from GitHub, so new builds need no pasting.
//   Student link:            .../exec          -> the "live" branch
//   Teacher test link:       .../exec?test=1   -> the "main" branch (newest build, not live yet)
// If GitHub cannot be reached, the copy of Index saved in this Apps Script project is used.
var GITHUB_RAW = 'https://raw.githubusercontent.com/jimmaoscott-lang/castlebuildermapsanditems/';
var LIVE_BRANCH = 'live';
var TEST_BRANCH = 'main';

var RESULTS_HEADERS = ['Time', 'Student email', 'Class period', 'Mission', 'Question tab', 'Difficulty',
  'Character', 'Background', 'Question', 'TEKS', 'Right/Wrong', 'Accommodations active', 'Guess flag', 'Event tag'];

var SUMMARY_HEADERS = ['Student email', 'Student name', 'Class period', 'Questions answered',
  '% correct', 'Best difficulty beaten', 'Class most-missed questions'];

var PROGRESS_HEADERS = ['Student email', 'Student name', 'Class period', 'TEKS', 'Questions answered',
  '% correct (guesses left out)', 'Guess-flagged answers', 'First attempt date', 'First attempt % correct',
  'Latest attempt date', 'Latest attempt % correct', 'Highest difficulty', 'Accommodations used'];

var DIFF_RANK = { 'easy': 1, 'medium': 2, 'hard': 3, 'expert': 4 };
var DIFF_NAME = ['', 'Easy', 'Medium', 'Hard', 'Expert'];
var MISSION_RESULT_TEXT = '(Mission result)';
var CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no I, O, 0, 1 (easy to mix up)

/* =========================================================
   WEB APP
   ========================================================= */
function doGet(e) {
  var test = !!(e && e.parameter && String(e.parameter.test) === '1');
  var html = fetchGameHtml_(test ? TEST_BRANCH : LIVE_BRANCH);
  var out = html ? HtmlService.createHtmlOutput(html) : HtmlService.createHtmlOutputFromFile('Index');
  return out
    .setTitle('The Exiled Crown')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Downloads code/Index.html from a GitHub branch. Returns '' if anything goes wrong. */
function fetchGameHtml_(branch) {
  try {
    var res = UrlFetchApp.fetch(GITHUB_RAW + branch + '/code/Index.html', { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return '';
    var text = res.getContentText('UTF-8');
    return text.indexOf('The Exiled Crown') >= 0 && text.indexOf('</html>') > 0 ? text : '';
  } catch (err) {
    return '';
  }
}

/** Which build each link is running (menu: Castle Game > Check game version). Run once in the editor to allow GitHub access. */
function checkGameVersion() {
  function ver(branch) {
    var t = fetchGameHtml_(branch);
    var m = t.match(/INDEX_VERSION = '([^']+)'/);
    return t ? (m ? m[1] : 'found, version unknown') : 'could not reach GitHub';
  }
  var msg = 'Student link (live): ' + ver(LIVE_BRANCH) + '  |  Test link (?test=1): ' + ver(TEST_BRANCH);
  Logger.log(msg);
  toast_(msg);
  return msg;
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Castle Game')
    .addItem('Update reports', 'updateReports')
    .addItem('Make backup codes', 'makeBackupCodes')
    .addItem('Check game version', 'checkGameVersion')
    .addSeparator()
    .addItem('New campaign (archive saves and results)', 'newCampaign')
    .addToUi();
}

/** Called by the game when it first opens. */
function getStartupData() {
  var email = currentEmail_();
  return {
    email: email,
    student: readStudent_(email),
    missions: readMissions_(),
    save: readSave_(email),
    artBases: ART_BASE_URLS,
    version: GAME_VERSION
  };
}

function currentEmail_() {
  try { return Session.getActiveUser().getEmail() || ''; } catch (err) { return ''; }
}

/** Missions tab: Mission | Mission name | Question tab | Open? */
function readMissions_() {
  var missions = [];
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Missions');
  if (!sheet) return missions;
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (row[0] === '' && row[1] === '') continue;
    var openText = String(row[3]).trim().toLowerCase();
    missions.push({
      number: Number(row[0]) || i,
      name: String(row[1] || ''),
      questionTab: String(row[2] || '').trim(),
      open: openText === 'yes' || openText === 'y' || openText === 'true'
    });
  }
  return missions;
}

/** Roster: School email | Student name | Class period | Read aloud | Extended time | Reduced choices | Unlocked character | Backup code */
function readRoster_() {
  var map = {};
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Roster');
  if (!sheet) return map;
  var values = sheet.getDataRange().getDisplayValues();
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    var em = String(r[0] || '').trim().toLowerCase();
    if (!em) continue;
    var s = {
      email: em,
      name: String(r[1] || '').trim() || nameFromEmail_(em),
      period: String(r[2] || ''),
      readAloud: yes_(r[3]),
      extended: yes_(r[4]),
      reduced: yes_(r[5]),
      code: String(r[7] || '').trim().toUpperCase()
    };
    applyCharacter_(s, r[6]);
    map[em] = s;
  }
  return map;
}

/**
 * Which accommodated character a student unlocks.
 * Read aloud + Reduced choices = Champion, Read aloud = Sage, Reduced choices = Ranger.
 * If the teacher typed a character name but left the boxes blank, the name is used.
 */
function applyCharacter_(s, sheetChar) {
  var c = String(sheetChar || '').trim().toLowerCase();
  if (!s.readAloud && !s.reduced) {
    if (c === 'champion') { s.readAloud = true; s.reduced = true; }
    else if (c === 'sage') s.readAloud = true;
    else if (c === 'ranger') s.reduced = true;
  }
  s.unlocked = s.readAloud && s.reduced ? 'Champion' : (s.readAloud ? 'Sage' : (s.reduced ? 'Ranger' : ''));
  return s;
}

/** What the game is allowed to see about a student (backup codes stay on the server). */
function publicStudent_(s) {
  return {
    onRoster: !!s.email,
    name: s.name || '',
    period: s.period || '',
    readAloud: !!s.readAloud,
    extended: !!s.extended,
    reduced: !!s.reduced,
    unlocked: s.unlocked || ''
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

/* =========================================================
   SELF SIGN-UP
   A student who is not on the Roster (or has no class period) picks a period 1-8.
   The game adds or updates their Roster row. Teachers only mark accommodations.
   ========================================================= */
function registerStudent(period) {
  var email = currentEmail_().trim().toLowerCase();
  if (!email) return { ok: false, error: 'Google did not send your school email. Ask your teacher for help.' };
  var p = Number(period);
  if (!(p >= 1 && p <= 8)) return { ok: false, error: 'Pick a class period from 1 to 8.' };
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var sheet = getOrMakeSheet_('Roster', ['School email', 'Student name', 'Class period', 'Read aloud',
      'Extended time', 'Reduced choices', 'Unlocked character', 'Backup code']);
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
      // first row with an empty email (formulas filled down column G make getLastRow too far down)
      row = last + 1;
      for (var k = 0; k < emails.length; k++) {
        if (!String(emails[k][0] || '').trim()) { row = k + 2; break; }
      }
      sheet.getRange(row, 1, 1, 3).setValues([[email, nameFromEmail_(email), String(p)]]);
      sheet.getRange(row, 8).setValue(newUniqueCode_(sheet));
      // copy the Unlocked character formula from row 2 if this row has none
      var g = sheet.getRange(row, 7);
      if (row > 2 && !g.getFormula()) {
        var f = sheet.getRange(2, 7).getFormulaR1C1();
        if (f) g.setFormulaR1C1(f);
      }
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

/** Game calls this when a student types a backup code. */
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
  if (!match.unlocked) {
    return { ok: false, error: 'That code is yours, but the Roster does not unlock a character for you yet. Ask your teacher.' };
  }
  return { ok: true, email: match.email, student: publicStudent_(match) };
}

/** Teacher menu: Castle Game > Make backup codes. Fills empty cells in Roster column H. */
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
   CAMPAIGN SAVES (Build 7)
   Saves: Student email | Last mission played | Missions completed | Castle save data | Last saved
   Castle save data is JSON: { castles: { "1": {...}, "2": {...}, "3": {...} } }
   Each castle holds buildings and surviving troops. A mission win replaces that
   mission's castle only if the new castle is at least as strong (replays can only improve it).
   ========================================================= */
var SAVES_HEADERS = ['Student email', 'Last mission played', 'Missions completed', 'Castle save data', 'Last saved'];

function findSaveRow_(sheet, email) {
  var last = sheet.getLastRow();
  if (last < 2) return -1;
  var emails = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < emails.length; i++) {
    if (String(emails[i][0] || '').trim().toLowerCase() === email) return i + 2;
  }
  return -1;
}

function readSave_(email) {
  email = String(email || '').trim().toLowerCase();
  var empty = { completed: [], castles: {} };
  if (!email) return empty;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Saves');
  if (!sheet) return empty;
  var row = findSaveRow_(sheet, email);
  if (row < 0) return empty;
  var r = sheet.getRange(row, 1, 1, 5).getValues()[0];
  var data = {};
  try { data = JSON.parse(String(r[3] || '{}')) || {}; } catch (err) { data = {}; }
  var done = String(r[2] || '').split(',').map(function (x) { return Number(String(x).trim()); })
    .filter(function (n) { return n >= 1 && n <= 4; });
  return { completed: done, castles: data.castles || {}, last: Number(r[1]) || 0 };
}

/** Game calls this when a mission ends. castle is null after a defeat. */
function saveCampaign(mission, won, castle, email) {
  var who = currentEmail_() || String(email || '');
  who = who.trim().toLowerCase();
  if (!who) return { ok: false, error: 'No school email, so progress was not saved.' };
  mission = Number(mission);
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var sheet = getOrMakeSheet_('Saves', SAVES_HEADERS);
    var save = readSave_(who);
    var kept = false;
    if (won && castle) {
      var old = save.castles[String(mission)];
      if (!old || Number(castle.score || 0) >= Number(old.score || 0)) {
        save.castles[String(mission)] = castle;
        kept = true;
      }
      if (save.completed.indexOf(mission) < 0) save.completed.push(mission);
      save.completed.sort();
    }
    var row = findSaveRow_(sheet, who);
    if (row < 0) row = sheet.getLastRow() + 1;
    sheet.getRange(row, 1, 1, 5).setValues([[who, mission, save.completed.join(', '),
      JSON.stringify({ castles: save.castles }), new Date()]]);
    SpreadsheetApp.flush();
    return { ok: true, kept: kept, save: { completed: save.completed, castles: save.castles, last: mission } };
  } finally {
    lock.releaseLock();
  }
}

/** Teacher menu: Castle Game > New campaign. Archives Saves and Results, then starts everyone at Mission 1. */
function newCampaign() {
  var ui = SpreadsheetApp.getUi();
  var ok = ui.alert('New campaign',
    'This copies the Saves and Results tabs into archive tabs, then empties them so every student starts again at Mission 1. Continue?',
    ui.ButtonSet.YES_NO);
  if (ok !== ui.Button.YES) return;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var stamp = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd HHmm');
  var moved = [];
  [['Saves', SAVES_HEADERS], ['Results', RESULTS_HEADERS]].forEach(function (t) {
    var sheet = ss.getSheetByName(t[0]);
    if (!sheet || sheet.getLastRow() < 2) return;
    sheet.copyTo(ss).setName(t[0] + ' archive ' + stamp);
    sheet.getRange(2, 1, sheet.getLastRow() - 1, Math.max(t[1].length, sheet.getLastColumn())).clearContent();
    moved.push(t[0]);
  });
  toast_(moved.length ? 'New campaign started. Archived: ' + moved.join(' and ') + ' (' + stamp + ').' : 'Nothing to archive. The campaign is already fresh.');
}

/* =========================================================
   QUESTIONS
   Question | Correct answer | Wrong 1 | Wrong 2 | Wrong 3 | Wrong 4 (Expert only) | Resource tag | TEKS
   ========================================================= */
function getQuestions(tabName) {
  tabName = String(tabName || '').trim();
  if (!tabName) return { tab: '', questions: [], error: 'No question tab is set for this mission in the Missions tab.' };
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tabName);
  if (!sheet) return { tab: tabName, questions: [], error: 'The question tab "' + tabName + '" was not found.' };
  var values = sheet.getDataRange().getDisplayValues();
  var list = [];
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    var q = String(r[0] || '').trim();
    var a = String(r[1] || '').trim();
    if (!q || !a) continue;
    list.push({
      q: q,
      a: a,
      w: [String(r[2] || '').trim(), String(r[3] || '').trim(), String(r[4] || '').trim()],
      w4: String(r[5] || '').trim(),
      tag: String(r[6] || '').trim().toLowerCase(),
      teks: String(r[7] || '').trim()
    });
  }
  if (!list.length) return { tab: tabName, questions: [], error: 'The question tab "' + tabName + '" has no questions yet.' };
  return { tab: tabName, questions: list, error: '' };
}

/* =========================================================
   RESULTS LOGGING (the game sends answers in small batches)
   ========================================================= */
function logAnswers(rows) {
  if (!rows || !rows.length) return 0;
  var sessionEmail = currentEmail_();
  var roster = readRoster_();
  var data = rows.map(function (r) {
    // a student who used a backup code (no email from Google) sends the code's email
    var email = sessionEmail || String(r.email || '');
    var student = roster[email.trim().toLowerCase()] || {};
    return [
      new Date(Number(r.time) || Date.now()),
      email,
      student.period || '',
      r.mission || '',
      r.tab || '',
      r.difficulty || '',
      r.character || '',
      r.background || '',
      r.question || '',
      r.teks || '',
      r.result || '',
      r.accom || '',
      r.guess ? 'Yes' : '',
      r.event || ''
    ];
  });
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var sheet = getOrMakeSheet_('Results', RESULTS_HEADERS);
    sheet.getRange(sheet.getLastRow() + 1, 1, data.length, RESULTS_HEADERS.length).setValues(data);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  return data.length;
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

/* =========================================================
   TEACHER REPORTS (menu: Castle Game > Update reports)
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
  var tz = ss.getSpreadsheetTimeZone();
  var values = results.getRange(2, 1, results.getLastRow() - 1, RESULTS_HEADERS.length).getValues();

  var students = {};   // email -> summary info
  var teksRows = {};   // email|teks -> progress info
  var missed = {};     // question -> {wrong, total}

  values.forEach(function (r) {
    var email = String(r[1] || '').trim().toLowerCase();
    var question = String(r[8] || '');
    if (!email || question === 'CONNECTION TEST') return;
    var diffRank = DIFF_RANK[String(r[5] || '').trim().toLowerCase()] || 0;
    var period = String(r[2] || '');
    var s = students[email] || (students[email] = { email: email, period: period, answered: 0, scored: 0, correct: 0, best: 0 });
    if (period) s.period = period;

    // Mission result rows: used only for "Best difficulty beaten"
    if (question === MISSION_RESULT_TEXT) {
      if (String(r[10]) === 'Victory' && diffRank > s.best) s.best = diffRank;
      return;
    }

    var right = String(r[10]) === 'Right';
    var guess = String(r[12]) === 'Yes';
    s.answered++;
    if (!guess) { s.scored++; if (right) s.correct++; }

    var m = missed[question] || (missed[question] = { wrong: 0, total: 0 });
    m.total++;
    if (!right) m.wrong++;

    var when = r[0] instanceof Date ? r[0] : new Date(r[0]);
    var day = isNaN(when.getTime()) ? '' : Utilities.formatDate(when, tz, 'yyyy-MM-dd');
    var accom = String(r[11] || '').trim();
    var codes = String(r[9] || '').split(',').map(function (c) { return c.trim(); }).filter(String);
    if (!codes.length) codes = ['(no TEKS)'];

    codes.forEach(function (code) {
      var key = email + '|' + code;
      var p = teksRows[key] || (teksRows[key] = {
        email: email, teks: code, answered: 0, scored: 0, correct: 0, guesses: 0,
        days: {}, best: 0, accom: {}
      });
      p.answered++;
      if (guess) p.guesses++;
      else { p.scored++; if (right) p.correct++; }
      if (day) {
        var d = p.days[day] || (p.days[day] = { scored: 0, correct: 0 });
        if (!guess) { d.scored++; if (right) d.correct++; }
      }
      if (diffRank > p.best) p.best = diffRank;
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
      s.scored ? s.correct / s.scored : '', s.best ? DIFF_NAME[s.best] : 'None yet', ''];
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
      p.best ? DIFF_NAME[p.best] : '', Object.keys(p.accom).join(', ')
    ]);
  });
  progRows.sort(function (a, b) {
    return sortByPeriodName_(a, b) || String(a[3]).localeCompare(String(b[3]));
  });
  writeTab_('Progress Report', PROGRESS_HEADERS, progRows, [6, 9, 11]);

  toast_('Reports updated: ' + sumRows.length + ' summary rows, ' + progRows.length + ' progress rows.');
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
  try { SpreadsheetApp.getActiveSpreadsheet().toast(msg, 'Castle Game', 6); } catch (e) {}
}
