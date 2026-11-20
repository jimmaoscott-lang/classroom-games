// Huddle Up: shared helpers, teams, chart values, camera projection.
var INDEX_VERSION = '0.7.0 special teams';
const QS = new URLSearchParams(location.search);
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const rnd = (a, b) => a + Math.random() * (b - a);
const irnd = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 0.75;
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function wpick(pairs) { let n = pairs.reduce((s, p) => s + p[1], 0) * Math.random(); for (const p of pairs) { if ((n -= p[1]) <= 0) return p[0]; } return pairs[0][0]; }

// Game length (teacher setting). Quick ~15 min, Standard ~30 min, Full Period ~45 min.
const LENGTHS = { Quick: 6, Standard: 12, 'Full Period': 18 };
const QUARTERS = 4;
let LENGTH = 'Standard', PLAYS_PER_QUARTER = 12, PLAYS_PER_GAME = 48;
// Teacher settings (the gear menu comes later). Test overrides: ?diff=Easy|Normal|Hard|Expert, ?rpp=1|2|3
const DIFFS = { Easy: { miss: 0.40, brk: 2 }, Normal: { miss: 0.25, brk: 4 }, Hard: { miss: 0.10, brk: 5 }, Expert: { miss: 0, brk: 6 } };
let DIFF = 'Normal', CPU_MISS = 0.25, CPU_BREAK_POINTS = 4; // set by applySettings()
// Teacher settings for this game. The gear menu (with the PIN from the Settings tab) comes with the Sheet in step 9.
function applySettings(length, diff) {
  LENGTH = LENGTHS[length] ? length : 'Standard';
  PLAYS_PER_QUARTER = LENGTHS[LENGTH]; PLAYS_PER_GAME = QUARTERS * PLAYS_PER_QUARTER;
  DIFF = DIFFS[diff] ? diff : 'Normal';
  CPU_MISS = DIFFS[DIFF].miss;        // how often the computer misses each huddle question
  CPU_BREAK_POINTS = DIFFS[DIFF].brk; // skill points the computer gets at each break
}
applySettings(QS.get('len'), QS.get('diff'));
const RATING_PER_POINT = [1, 2, 3].includes(+QS.get('rpp')) ? +QS.get('rpp') : 2;
const RATING_CAP = 100;
const INJURY_STREAK = 3, INJURY_PLAYS = 3; // 3 wrong in a row = a player is shaken up for 3 plays
const EXTENDED_TIME = 1.5;                // guessing speed check is 1.5x longer with extended time
const OFF_CALLS = ['Run Inside', 'Run Outside', 'Short Pass', 'Deep Pass', 'Play Action'];
const DEF_CALLS = ['Blitz', 'Zone', 'Man Coverage', 'Stack the Box'];
// Matchup chart from the design plan. G = favors offense, B = favors defense, E = even, R = risky (sack or big play).
const MATCHUP = {
  'Run Inside':  { 'Blitz': 'E', 'Zone': 'G', 'Man Coverage': 'G', 'Stack the Box': 'B' },
  'Run Outside': { 'Blitz': 'G', 'Zone': 'E', 'Man Coverage': 'G', 'Stack the Box': 'E' },
  'Short Pass':  { 'Blitz': 'G', 'Zone': 'E', 'Man Coverage': 'B', 'Stack the Box': 'G' },
  'Deep Pass':   { 'Blitz': 'R', 'Zone': 'B', 'Man Coverage': 'E', 'Stack the Box': 'G' },
  'Play Action': { 'Blitz': 'B', 'Zone': 'G', 'Man Coverage': 'E', 'Stack the Box': 'G' },
};
// Ratings compared on each play (offense side vs defense side). Also the players "in the play" for penalties.
const RATINGS_USED = {
  'Run Inside':  [['RB', 'O-Line'], ['D-Line', 'Linebacker']],
  'Run Outside': [['RB', 'O-Line'], ['D-Line', 'Linebacker']],
  'Short Pass':  [['QB', 'WR', 'O-Line'], ['Secondary', 'D-Line']],
  'Deep Pass':   [['QB', 'WR', 'O-Line'], ['Secondary', 'D-Line']],
  'Play Action': [['QB', 'WR', 'O-Line', 'RB'], ['Linebacker', 'Secondary', 'D-Line']],
};
// Position duels: each one nudges the part of the play that position controls.
//   line:  O-Line vs D-Line (vs D-Line + Linebacker on a Blitz)  -> run push, sacks
//   back:  RB vs Linebacker                                      -> breaking tackles, big runs, fumbles
//   arm:   QB vs Secondary                                       -> completions, interceptions
//   hands: WR vs Secondary                                       -> completions, yards after catch
//   fake:  RB vs Linebacker (Play Action only)                   -> completions on the fake
// Tuned with tests/balance-test.js so right answers still beat an 80-rated team that misses,
// and a whole roster at 100 that misses only plays about even with a 60s team that answers.
let DUEL_SPAN = 25, DUEL_K = 0.6, DUEL_T = 0.08; // a 25-point rating gap is the biggest edge a duel can give
// Players "in the play" for the first-miss rating penalty.
const DEF_PLAYERS = { 'Blitz': ['D-Line', 'Linebacker'], 'Zone': ['Secondary', 'Linebacker'], 'Man Coverage': ['Secondary', 'Linebacker'], 'Stack the Box': ['D-Line', 'Linebacker'] };
const TEAMS = {
  home: { name: 'PELICANS', short: 'Pelicans', abbr: 'PEL', jersey: '#0E7C86', helmet: '#F28C28', pants: '#F4F1E8', num: '#FFFFFF', zone: '#0B5F67' },
  away: { name: 'COMETS', short: 'Comets', abbr: 'COM', jersey: '#5B2A86', helmet: '#F2C14E', pants: '#2B1640', num: '#FFFFFF', zone: '#43206A' },
};
// Jersey numbers by role, in formation order.
const NUMS = {
  home: { off: { OL: [77, 52, 64, 70, 75], TE: [88], WR: [11, 84, 1], QB: [7], RB: [22] }, def: { DL: [91, 93, 95, 98], LB: [52, 54, 57], CB: [20, 26], S: [31, 35] } },
  away: { off: { OL: [60, 62, 65, 68, 71], TE: [86], WR: [80, 81, 3], QB: [12], RB: [28] }, def: { DL: [90, 94, 97, 99], LB: [50, 55, 58], CB: [21, 24], S: [30, 33] } },
};
const POS = ['QB', 'RB', 'WR', 'O-Line', 'D-Line', 'Linebacker', 'Secondary', 'Kicker'];
const POS_INFO = { 'QB': 'Pass accuracy', 'RB': 'Breaking tackles', 'WR': 'Catching, getting open', 'O-Line': 'Blocking', 'D-Line': 'Pass rush, run stopping', 'Linebacker': 'Tackling, run defense', 'Secondary': 'Coverage, interceptions', 'Kicker': 'Distance, accuracy' };
// Which player on the field wears the trainer icon when a position is shaken up.
const POS_ROLE = { 'QB': ['QB', 0], 'RB': ['RB', 0], 'WR': ['WR', 0], 'O-Line': ['C', 0], 'D-Line': ['DL', 1], 'Linebacker': ['LB', 1], 'Secondary': ['S', 0] };

let G = null;
const QUESTIONS = SAMPLE_QUESTIONS.map(r => ({ q: r[0], a: r[1], w: [r[2], r[3], r[4]].filter(Boolean) }));
const other = t => t === 'home' ? 'away' : 'home';
const dir = () => G.poss === 'home' ? 1 : -1;               // offense moves +x (Pelicans) or -x (Comets)
const ytg = () => G.poss === 'home' ? 100 - G.ballX : G.ballX; // yards to the goal line for the offense
const ownSpot = (team, yds) => team === 'home' ? yds : 100 - yds; // world x of a team's own N-yard line

// ---------- projection (same math as the Look C mockup) ----------
// World x: 0 = Pelicans goal line (left), 100 = Comets goal line (right). d: 0 far sideline, 1 near sideline.
function pt(f, d) { return [160 * (1 - d) + (960 + 320 * d) * f, 50 + 400 * d]; }
function proj(x, d) { return pt((x - G.camX) / 50 + 0.5, d); }
const camTarget = (x, s) => clamp(x + 8 * (s || 1), 15, 85);
