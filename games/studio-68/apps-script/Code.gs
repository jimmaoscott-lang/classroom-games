/**
 * STUDIO '68 - Guitar Hero style review game
 * Code.gs  |  Build 1
 *
 * Built from The Exiled Crown's reporting system (shared/reporting/exiled-crown-Code.gs.reference).
 * - Serves the game page from GitHub (live branch for students, ?test=1 for main)
 * - Roster sign-in, self sign-up by class period, backup codes
 * - Sets tab picks which question tabs are open
 * - Writes every answer to Results, every song played to Song Plays
 * - Saves tab keeps records, unlocks and songs; Radio tab holds shared songs
 * - Teacher menu "Studio 68": Set up tabs, Update reports, backup codes, Radio on/off, New season
 */

var GAME_VERSION = 'Build 1';

// The game page loads straight from GitHub, so new builds need no pasting.
//   Student link:       .../exec          -> the "live" branch
//   Teacher test link:  .../exec?test=1   -> the "main" branch (newest build, not live yet)
// If GitHub cannot be reached, the small Index file saved in this Apps Script project is shown.
var GITHUB_RAW = 'https://raw.githubusercontent.com/jimmaoscott-lang/classroom-games/';
var PAGE_PATH = '/games/studio-68/game/index.html';
var LIVE_BRANCH = 'live';
var TEST_BRANCH = 'main';

// Instrument sounds load from here (first address, then the backup if a filter blocks it).
var AUDIO_BASE_URLS = [
  'https://cdn.jsdelivr.net/gh/jimmaoscott-lang/classroom-games@main/games/studio-68/audio/',
  'https://raw.githubusercontent.com/jimmaoscott-lang/classroom-games/main/games/studio-68/audio/'
];

var ROSTER_HEADERS = ['School email', 'Student name', 'Class period', 'Read aloud', 'Extended time',
  'Reduced choices', 'Notes', 'Backup code'];
var SETS_HEADERS = ['Set number', 'Set name', 'Question tab', 'Open?'];
var QUESTION_HEADERS = ['Question', 'Correct answer', 'Wrong answer 1', 'Wrong answer 2', 'Wrong answer 3',
  'Wrong answer 4', 'Resource tag', 'TEKS'];
var RESULTS_HEADERS = ['Time', 'Student email', 'Class period', 'Set', 'Question tab', 'Difficulty',
  'Question', 'TEKS', 'Right/Wrong', 'Accommodations active', 'Guess flag', 'Event tag'];
var PLAYS_HEADERS = ['Time', 'Student email', 'Class period', 'Song name', 'Song owner', 'Part',
  'Chart level', 'Assists', 'Accuracy', 'Stars', 'Score'];
var SAVES_HEADERS = ['Student email', 'Stage name', 'Records', 'Packs', 'Riffs', 'Songs', 'Game data', 'Last saved'];
var RADIO_HEADERS = ['Time', 'Student email', 'Class period', 'Stage name', 'Song name', 'Song data', 'Hide'];
var SETTINGS_HEADERS = ['Setting', 'Value', 'What it does'];
var GOALS_HEADERS = ['School email', 'Student name', 'IEP goal TEKS (commas)', 'Notes'];

var SUMMARY_HEADERS = ['Student email', 'Student name', 'Class period', 'Questions answered',
  '% correct', 'Highest difficulty answered', 'Class most-missed questions'];
var PROGRESS_HEADERS = ['Student email', 'Student name', 'Class period', 'TEKS', 'Questions answered',
  '% correct (guesses left out)', 'Guess-flagged answers', 'First attempt date', 'First attempt % correct',
  'Latest attempt date', 'Latest attempt % correct', 'Highest difficulty', 'Accommodations used'];

var DIFF_RANK = { 'easy': 1, 'medium': 2, 'hard': 3 };
var DIFF_NAME = ['', 'Easy', 'Medium', 'Hard'];
var CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no I, O, 0, 1 (easy to mix up)
var SAMPLE_TAB = 'Sample Vietnam Era';

/* =========================================================
   WEB APP
   ========================================================= */
function doGet(e) {
  var test = !!(e && e.parameter && String(e.parameter.test) === '1');
  var html = fetchGameHtml_(test ? TEST_BRANCH : LIVE_BRANCH);
  var out = html ? HtmlService.createHtmlOutput(html) : HtmlService.createHtmlOutputFromFile('Index');
  return out
    .setTitle("Studio '68")
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Downloads the game page from a GitHub branch. Returns '' if anything goes wrong. */
function fetchGameHtml_(branch) {
  try {
    var res = UrlFetchApp.fetch(GITHUB_RAW + branch + PAGE_PATH, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return '';
    var text = res.getContentText('UTF-8');
    return text.indexOf('STUDIO68_PAGE') >= 0 && text.indexOf('</html>') > 0 ? text : '';
  } catch (err) {
    return '';
  }
}

/** Which build each link is running (menu: Studio 68 > Check game version). */
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
    .createMenu('Studio 68')
    .addItem('Set up tabs', 'setupTabs')
    .addItem('Update reports', 'updateReports')
    .addItem('Make backup codes', 'makeBackupCodes')
    .addSeparator()
    .addItem('Turn Radio on', 'turnRadioOn')
    .addItem('Turn Radio off', 'turnRadioOff')
    .addSeparator()
    .addItem('Check game version', 'checkGameVersion')
    .addItem('New season (archive saves and Radio)', 'newSeason')
    .addToUi();
}

/** Called by the game when it first opens. */
function getStartupData() {
  var email = currentEmail_();
  return {
    email: email,
    student: readStudent_(email),
    sets: readSets_(),
    save: readSave_(email),
    radioOpen: radioOpen_(),
    audioBases: AUDIO_BASE_URLS,
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
  if (sets.getLastRow() < 2) sets.getRange(2, 1, 1, 4).setValues([[1, 'Sample: Vietnam Era', SAMPLE_TAB, 'Yes']]);
  ensure('Results', RESULTS_HEADERS);
  ensure('Song Plays', PLAYS_HEADERS);
  ensure('Saves', SAVES_HEADERS);
  ensure('Radio', RADIO_HEADERS);
  var settings = ensure('Settings', SETTINGS_HEADERS);
  if (settings.getLastRow() < 2) {
    settings.getRange(2, 1, 1, 3).setValues([['Radio open?', 'No',
      'Yes lets students share songs with their class period and play classmates\' songs.']]);
  }
  ensure('Goals', GOALS_HEADERS);
  toast_(made.length ? 'Made tabs: ' + made.join(', ') + '.' : 'All tabs were already set up.');
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
   (Same columns as The Exiled Crown. Its "Unlocked character" column G is fine to keep.)
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
    var s = {
      email: em,
      name: String(r[1] || '').trim() || nameFromEmail_(em),
      period: String(r[2] || ''),
      readAloud: yes_(r[3]),
      extended: yes_(r[4]),
      reduced: yes_(r[5]),
      code: String(r[7] || '').trim().toUpperCase()
    };
    // An Exiled Crown character name in column G still counts if the boxes are blank
    var c = String(r[6] || '').trim().toLowerCase();
    if (!s.readAloud && !s.reduced) {
      if (c === 'champion') { s.readAloud = true; s.reduced = true; }
      else if (c === 'sage') s.readAloud = true;
      else if (c === 'ranger') s.reduced = true;
    }
    map[em] = s;
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
  return { ok: true, email: match.email, student: publicStudent_(match), save: readSave_(match.email) };
}

/** Teacher menu: Studio 68 > Make backup codes. Fills empty cells in Roster column H. */
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
   QUESTIONS
   Question | Correct answer | Wrong 1 | Wrong 2 | Wrong 3 | Wrong 4 (Hard only) | Resource tag | TEKS
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
  var roster = readRoster_();
  var data = rows.map(function (r) {
    var email = who_(r.email);
    var student = roster[email] || {};
    return [
      new Date(Number(r.time) || Date.now()), email, student.period || '',
      r.set || '', r.tab || '', r.difficulty || '', r.question || '', r.teks || '',
      r.result || '', r.accom || '', r.guess ? 'Yes' : '', r.event || ''
    ];
  });
  appendRows_('Results', RESULTS_HEADERS, data);
  return data.length;
}

/** One row per song performance. Kept out of all reports. */
function logPlay(r) {
  if (!r) return 0;
  var email = who_(r.email);
  var student = readRoster_()[email] || {};
  appendRows_('Song Plays', PLAYS_HEADERS, [[
    new Date(), email, student.period || '', r.song || '', r.owner || '', r.part || '',
    r.level || '', r.assists || '', Number(r.accuracy) || 0, Number(r.stars) || 0, Number(r.score) || 0
  ]]);
  return 1;
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

/* =========================================================
   SAVES
   Student email | Stage name | Records | Packs | Riffs | Songs (JSON) | Game data (JSON) | Last saved
   ========================================================= */
function findRow_(sheet, email) {
  var last = sheet.getLastRow();
  if (last < 2) return -1;
  var emails = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < emails.length; i++) {
    if (String(emails[i][0] || '').trim().toLowerCase() === email) return i + 2;
  }
  return -1;
}

function parse_(text, fallback) {
  try { var v = JSON.parse(String(text || '')); return v == null ? fallback : v; } catch (err) { return fallback; }
}

function readSave_(email) {
  email = String(email || '').trim().toLowerCase();
  if (!email) return null;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Saves');
  if (!sheet) return null;
  var row = findRow_(sheet, email);
  if (row < 0) return null;
  var r = sheet.getRange(row, 1, 1, SAVES_HEADERS.length).getValues()[0];
  function list(v) { return String(v || '').split(',').map(function (x) { return x.trim(); }).filter(String); }
  return {
    stage: String(r[1] || ''),
    records: Number(r[2]) || 0,
    packs: list(r[3]),
    riffs: list(r[4]),
    songs: parse_(r[5], []),
    data: parse_(r[6], {})
  };
}

/** Game calls this after every unlock or song change. */
function saveProgress(save, email) {
  var who = who_(email);
  if (!who) return { ok: false, error: 'No school email, so progress was not saved.' };
  if (!save) return { ok: false, error: 'Nothing to save.' };
  var row = [
    who,
    String(save.stage || '').slice(0, 40),
    Math.max(0, Math.floor(Number(save.records) || 0)),
    (save.packs || []).join(', '),
    (save.riffs || []).join(', '),
    JSON.stringify(save.songs || []),
    JSON.stringify(save.data || {}),
    new Date()
  ];
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var sheet = getOrMakeSheet_('Saves', SAVES_HEADERS);
    var r = findRow_(sheet, who);
    if (r < 0) r = sheet.getLastRow() + 1;
    sheet.getRange(r, 1, 1, SAVES_HEADERS.length).setValues([row]);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  return { ok: true };
}

/* =========================================================
   RADIO
   Time | Student email | Class period | Stage name | Song name | Song data (JSON) | Hide
   ========================================================= */
function radioOpen_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
  if (!sheet || sheet.getLastRow() < 2) return false;
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getDisplayValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim().toLowerCase() === 'radio open?') return yes_(values[i][1]);
  }
  return false;
}

function setRadio_(on) {
  var sheet = getOrMakeSheet_('Settings', SETTINGS_HEADERS);
  var last = sheet.getLastRow();
  var row = -1;
  if (last > 1) {
    var names = sheet.getRange(2, 1, last - 1, 1).getDisplayValues();
    for (var i = 0; i < names.length; i++) {
      if (String(names[i][0]).trim().toLowerCase() === 'radio open?') { row = i + 2; break; }
    }
  }
  if (row < 0) {
    row = last + 1;
    sheet.getRange(row, 1).setValue('Radio open?');
    sheet.getRange(row, 3).setValue('Yes lets students share songs with their class period and play classmates\' songs.');
  }
  sheet.getRange(row, 2).setValue(on ? 'Yes' : 'No');
  toast_(on ? 'The Radio is ON. Students see it the next time they open the game.' : 'The Radio is OFF.');
}
function turnRadioOn() { setRadio_(true); }
function turnRadioOff() { setRadio_(false); }

/** Songs shared by students in the same class period (hidden songs left out). */
function getRadio(email) {
  if (!radioOpen_()) return { open: false, songs: [] };
  var who = who_(email);
  var me = readRoster_()[who] || {};
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Radio');
  var songs = [];
  if (sheet && sheet.getLastRow() > 1) {
    var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, RADIO_HEADERS.length).getValues();
    values.forEach(function (r, i) {
      if (yes_(r[6])) return;
      if (String(r[2]) !== String(me.period || '')) return;
      var data = parse_(r[5], null);
      if (!data || !data.sel) return;
      songs.push({ id: i + 2, stage: String(r[3] || 'Unknown artist'), name: String(r[4] || 'Untitled'),
        sel: data.sel, mine: String(r[1]).trim().toLowerCase() === who });
    });
  }
  songs.reverse();   // newest first
  return { open: true, songs: songs.slice(0, 60) };
}

/** "Send to Radio": one Radio row per student and song name (sending again replaces it). */
function shareSong(song, email) {
  if (!radioOpen_()) return { ok: false, error: 'The Radio is off right now.' };
  var who = who_(email);
  if (!who) return { ok: false, error: 'No school email, so the song was not shared.' };
  if (!song || !song.sel || !song.name) return { ok: false, error: 'Pick a song first.' };
  var me = readRoster_()[who] || {};
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var sheet = getOrMakeSheet_('Radio', RADIO_HEADERS);
    var row = -1;
    var last = sheet.getLastRow();
    if (last > 1) {
      var values = sheet.getRange(2, 1, last - 1, 5).getValues();
      for (var i = 0; i < values.length; i++) {
        if (String(values[i][1]).trim().toLowerCase() === who && String(values[i][4]) === String(song.name)) { row = i + 2; break; }
      }
    }
    var hidden = row > 0 ? sheet.getRange(row, 7).getValue() : '';
    if (row < 0) row = last + 1;
    sheet.getRange(row, 1, 1, RADIO_HEADERS.length).setValues([[new Date(), who, me.period || '',
      String(song.stage || '').slice(0, 40), String(song.name).slice(0, 60), JSON.stringify({ sel: song.sel }), hidden]]);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  return { ok: true };
}

/** Teacher menu: New season. Archives Saves and Radio, then empties them. Results are kept. */
function newSeason() {
  var ui = SpreadsheetApp.getUi();
  var ok = ui.alert('New season',
    'This copies the Saves and Radio tabs into archive tabs, then empties them. Every student starts over with 0 records and only the Folk pack. Results and reports are kept. Continue?',
    ui.ButtonSet.YES_NO);
  if (ok !== ui.Button.YES) return;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var stamp = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd HHmm');
  var moved = [];
  [['Saves', SAVES_HEADERS], ['Radio', RADIO_HEADERS]].forEach(function (t) {
    var sheet = ss.getSheetByName(t[0]);
    if (!sheet || sheet.getLastRow() < 2) return;
    sheet.copyTo(ss).setName(t[0] + ' archive ' + stamp);
    sheet.getRange(2, 1, sheet.getLastRow() - 1, Math.max(t[1].length, sheet.getLastColumn())).clearContent();
    moved.push(t[0]);
  });
  toast_(moved.length ? 'New season started. Archived: ' + moved.join(' and ') + ' (' + stamp + ').' : 'Nothing to archive. The season is already fresh.');
}

/* =========================================================
   TEACHER REPORTS (menu: Studio 68 > Update reports)
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
    var question = String(r[6] || '');
    if (!email || !question || question === 'CONNECTION TEST') return;
    var diffRank = DIFF_RANK[String(r[5] || '').trim().toLowerCase()] || 0;
    var period = String(r[2] || '');
    var s = students[email] || (students[email] = { email: email, period: period, answered: 0, scored: 0, correct: 0, best: 0 });
    if (period) s.period = period;

    var right = String(r[8]) === 'Right';
    var guess = String(r[10]) === 'Yes';
    s.answered++;
    if (!guess) { s.scored++; if (right) s.correct++; }
    if (diffRank > s.best) s.best = diffRank;

    var m = missed[question] || (missed[question] = { wrong: 0, total: 0 });
    m.total++;
    if (!right) m.wrong++;

    var when = r[0] instanceof Date ? r[0] : new Date(r[0]);
    var day = isNaN(when.getTime()) ? '' : Utilities.formatDate(when, tz, 'yyyy-MM-dd');
    var accom = String(r[9] || '').trim();
    var codes = String(r[7] || '').split(',').map(function (c) { return c.trim(); }).filter(String);
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
      s.scored ? s.correct / s.scored : '', s.best ? DIFF_NAME[s.best] : '', ''];
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
  try { SpreadsheetApp.getActiveSpreadsheet().toast(msg, 'Studio 68', 6); } catch (e) {}
}

/* =========================================================
   SAMPLE QUESTION TAB (made by "Set up tabs"; fill in the TEKS column with current codes)
   ========================================================= */
var SAMPLE_QUESTIONS = [
  ['What did the Gulf of Tonkin Resolution (1964) give President Johnson?', 'Broad power to use military force in Vietnam without a declaration of war', 'The power to end the draft', 'A treaty ending the war with North Vietnam', 'Money to rebuild South Vietnam after the war', 'Control of the Federal Reserve', '', ''],
  ['What did the domino theory predict?', 'If one Southeast Asian nation fell to communism, its neighbors would follow', 'Communism would collapse on its own', 'The U.S. economy would fall if the war ended', 'Vietnam would split into many small nations', 'Europe would join the war', '', ''],
  ['Why was the Tet Offensive (1968) a turning point?', 'It shocked Americans and turned more public opinion against the war', 'It was the first U.S. victory in Vietnam', 'It ended the war in a cease-fire', 'It was the first battle with U.S. ground troops', 'It led to the draft lottery', '', ''],
  ['What was the "credibility gap"?', 'Public doubt that the government was telling the truth about the war', 'The gap between rich and poor soldiers', 'A break in the Ho Chi Minh Trail', 'The age gap between voters and soldiers', 'A shortage of weapons in Vietnam', '', ''],
  ['What was Vietnamization?', "Nixon's plan to withdraw U.S. troops while South Vietnam took over the fighting", 'Moving Vietnamese refugees to the U.S.', 'Teaching U.S. soldiers the Vietnamese language', 'A plan to unite North and South Vietnam', 'A plan to send more U.S. troops', '', ''],
  ['What did the 26th Amendment (1971) do?', 'Lowered the voting age to 18', 'Ended the military draft', 'Limited presidents to two terms', 'Gave Congress control of war spending', 'Gave women the right to vote', '', ''],
  ['What happened at Kent State University in 1970?', 'National Guard troops fired on student protesters, killing four', 'Students burned draft cards at a concert', 'The first draft lottery was held', 'Nixon announced the end of the war', 'Students took over the White House lawn', '', ''],
  ['How did the 1969 draft lottery decide who was called first?', 'By birth date, drawn at random', 'By last name, in alphabetical order', 'By grades in school', 'By state population', 'By height and weight', '', ''],
  ['What did the War Powers Resolution (1973) require?', 'The president must notify Congress within 48 hours of sending troops into combat', 'Every war must be approved by voters', 'The draft must end in peacetime', 'Only Congress can command the military', 'Troops can only serve one year overseas', '', ''],
  ['What happened at the fall of Saigon in 1975?', 'North Vietnam captured the South Vietnamese capital, ending the war', 'U.S. troops captured Hanoi', 'South Vietnam signed a peace treaty with the U.S.', 'The Tet Offensive began', 'The UN took control of Vietnam', '', ''],
  ['What did the Pentagon Papers reveal?', 'The government had misled the public about the war for years', 'Plans to invade China', 'Secret peace talks that ended the war', 'The names of antiwar protest leaders', 'A plan to end the draft early', '', ''],
  ['Who were the Viet Cong?', 'Communist guerrilla fighters in South Vietnam', 'South Vietnamese army officers', 'U.S. Special Forces units', 'French colonial soldiers', 'Chinese air force pilots', '', ''],
  ['What was the Ho Chi Minh Trail?', 'A supply route through Laos and Cambodia into South Vietnam', 'A protest march in Washington, D.C.', 'A U.S. Navy shipping lane', 'The border line between North and South Vietnam', 'A railroad built by the French', '', ''],
  ['Why is Vietnam called the "living room war"?', 'Nightly TV news brought images of combat into American homes', 'Soldiers fought mostly inside buildings', 'Most Americans watched it live in theaters', 'It was planned from the White House living room', 'Radio was the only way to get news', '', ''],
  ['Who were the "silent majority"?', 'Americans Nixon said quietly supported his policies and did not protest', 'Soldiers who refused to talk to reporters', 'Members of Congress who skipped war votes', 'Protesters who used silent sit-ins', 'Voters who stayed home on election day', '', ''],
  ['In the Vietnam debate, what did "doves" want?', 'To end U.S. involvement in the war', 'To escalate the war and win', 'To bring back the draft', 'To invade North Vietnam', 'To send troops to Cambodia', '', '']
];
