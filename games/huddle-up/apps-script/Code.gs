/**
 * HUDDLE UP - football coach review game
 * Code.gs  |  Build 0.6 (starter: serves the game and runs Head-to-Head)
 *
 * This starter does two things:
 * - Serves the game page from GitHub (live branch for students, ?test=1 for the newest build on main)
 * - Passes Head-to-Head messages between two computers (game codes, play calls) using CacheService
 * Build step 9 replaces this file with the full version (roster sign-in, Sets, Results, Games tab, reports),
 * built from Studio 68's Code.gs. The Head-to-Head part below carries over unchanged.
 */

var GAME_VERSION = 'Build 0.6 starter';

// The game page loads straight from GitHub, so new builds need no pasting.
//   Student link:       .../exec          -> the "live" branch
//   Teacher test link:  .../exec?test=1   -> the "main" branch (newest build, not live yet)
// If GitHub cannot be reached, the small Index file saved in this Apps Script project is shown.
var GITHUB_RAW = 'https://raw.githubusercontent.com/jimmaoscott-lang/classroom-games/';
var PAGE_PATH = '/games/huddle-up/game/index.html';
var LIVE_BRANCH = 'live';
var TEST_BRANCH = 'main';

/* =========================================================
   WEB APP
   ========================================================= */
function doGet(e) {
  var test = !!(e && e.parameter && String(e.parameter.test) === '1');
  var html = fetchGameHtml_(test ? TEST_BRANCH : LIVE_BRANCH);
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
  try { SpreadsheetApp.getActiveSpreadsheet().toast(msg, 'Huddle Up', 10); } catch (err) { }
  return msg;
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Huddle Up')
    .addItem('Check game version', 'checkGameVersion')
    .addToUi();
}

/* =========================================================
   HEAD-TO-HEAD (two computers)
   Live game info stays in Apps Script's fast temporary storage (CacheService) for up to 6 hours.
   Nothing is written to the Sheet here; finished results go to the Games tab in step 9.
   Keys:  h2h_CODE          game info (settings, random seed)
          h2h_CODE_guest    set when the second coach joins
          h2h_CODE_SIDE_N   message number N sent by side 'home' or 'away'
   Each side only writes its own message keys, so two coaches never overwrite each other.
   ========================================================= */
var H2H_HOURS = 6;
var H2H_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';   // no I or O

function h2hCache_() { return CacheService.getScriptCache(); }
function h2hSecs_() { return H2H_HOURS * 3600; }
function h2hCode_(code) { return String(code || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4); }

/** Head-to-Head button: makes a new 4-letter game code. */
function h2hCreate(settings) {
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
    cache.put('h2h_' + code, JSON.stringify({ settings: settings || {}, seed: seed, t: Date.now() }), h2hSecs_());
    return { code: code, seed: seed };
  } finally {
    lock.releaseLock();
  }
}

/** Join a Game button: checks the code and marks the game as full. */
function h2hJoin(code) {
  code = h2hCode_(code);
  var cache = h2hCache_(), lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var meta = cache.get('h2h_' + code);
    if (!meta) return { ok: false, msg: 'No game with that code. Check the code with the other coach.' };
    if (cache.get('h2h_' + code + '_guest')) return { ok: false, msg: 'That game already has two coaches.' };
    cache.put('h2h_' + code + '_guest', '1', h2hSecs_());
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
