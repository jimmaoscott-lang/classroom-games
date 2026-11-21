// Headless checks for build step 8: the Google Sheet connection (apps-script/Code.gs) and reports.
// Code.gs runs in Node with Sheets, Session, Cache and Lock mocked (tests/gas-mock.js). Browser pages call it
// through a fake google.script.run, each page signed in as a different student.
// Run from games/huddle-up after bash src/build-game.sh:  node tests/step8-test.js [outdir]
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const { makeGas } = require('./gas-mock');
const out = process.argv[2] || '/tmp';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const gs = makeGas('apps-script/Code.gs');
const tab = n => gs.__sheets[n] ? gs.__sheets[n].rows() : null;
// Test students (made up)
const A = 'pat.tester@school.test', B = 'sam.sample@school.test', NEW = 'new.kid@school.test';

// ---------- Part 1: Code.gs on its own ----------
gs.__as('', 'setupTabs');
['Roster', 'Sets', 'Sample Great Depression', 'Results', 'Games', 'Settings', 'Goals', 'Student Report'].forEach(n => ok(!!gs.__sheets[n], 'Set up tabs made ' + n));
ok(!gs.__sheets['Saves'] && !gs.__sheets['Radio'] && !gs.__sheets['Song Plays'], 'no Saves, Radio or Song Plays tabs');
ok(tab('Results')[0].join('|') === 'Time|Student email|Class period|Set|Question tab|Question|TEKS|Right/Wrong|Accommodations active|Guess flag|Event tag', 'Results columns match the design (no Difficulty)');
ok(tab('Games')[0].join('|') === 'Time|Player 1|Player 2|Class period|Set|Mode|Difficulty|Game length|Score|Winner|Finished?', 'Games columns match the design');
ok(tab('Settings').map(r => r[0]).join('|') === 'Setting|Teacher PIN|Game length|Computer difficulty|Rating per skill point|Play clock|Read aloud for everyone|Report start date|Report end date', 'Settings rows: PIN, game settings, report dates');
ok(/Teacher PIN/.test(gs.__toasts.pop()), 'setup reminds the teacher to type a PIN');
gs.__as('', 'setupTabs'); ok(tab('Settings').length === 9, 'running Set up tabs again adds no duplicate rows');
// Roster: A has reduced choices + read aloud, B extended time
const roster = gs.__sheets.Roster;
roster.getRange(2, 1, 2, 8).setValues([[A, 'Pat Tester', '3', 'Yes', '', 'Yes', '', 'AAA222'], [B, 'Sam Sample', '3', '', 'Yes', '', '', 'BBB333']]);
// second set with 4 questions
const sets = gs.__sheets.Sets; sets.getRange(3, 1, 1, 4).setValues([[2, 'Short set', 'Short Tab', 'Yes']]);
gs.SpreadsheetApp.getActiveSpreadsheet().insertSheet('Short Tab');
gs.__sheets['Short Tab'].getRange(1, 1, 5, 8).setValues([['Question', 'Correct answer', 'Wrong answer 1', 'Wrong answer 2', 'Wrong answer 3', 'Wrong answer 4', 'Resource tag', 'TEKS'],
  ['Short Q1?', 'Right 1', 'Wrong 1a', 'Wrong 1b', 'Wrong 1c', 'Spare', '', '113.41(c)(1)(A)'], ['Short Q2?', 'Right 2', 'Wrong 2a', 'Wrong 2b', 'Wrong 2c', '', '', '113.41(c)(1)(A)'],
  ['Short Q3?', 'Right 3', 'Wrong 3a', 'Wrong 3b', 'Wrong 3c', '', '', '113.41(c)(2)(B)'], ['Short Q4?', 'Right 4', 'Wrong 4a', 'Wrong 4b', 'Wrong 4c', '', '', '113.41(c)(2)(B)']]);
let d = gs.__as(A, 'getStartupData');
ok(d.email === A && d.student.name === 'Pat Tester' && d.student.period === '3' && d.student.reduced && d.student.readAloud && !d.student.extended, 'startup: Roster name, period and accommodations');
ok(!('code' in d.student) && JSON.stringify(d).indexOf('AAA222') < 0, 'backup code is never sent to the page');
ok(d.sets.length === 2 && d.sets[1].questionTab === 'Short Tab', 'startup: open sets');
ok(d.settings.length === 'Standard' && d.settings.ppq === 12 && d.settings.difficulty === 'Normal' && d.settings.rpp === 2 && d.settings.clock === 0 && !d.settings.readAll && !d.settings.pinSet, 'startup: default settings, no PIN yet');
ok(JSON.stringify(d).indexOf('PIN') < 0, 'startup does not include the PIN');
let q = gs.__as(A, 'getQuestions', ['Short Tab']);
ok(q.questions.length === 4 && q.questions[0].w.length === 3 && q.questions[0].teks === '113.41(c)(1)(A)' && !q.questions[0].w.includes('Spare'), 'questions: 3 wrong answers (Wrong answer 4 not used), TEKS');
ok(/not found/.test(gs.__as(A, 'getQuestions', ['Nope']).error), 'missing question tab gives a clear error');
// PIN + settings
ok(!gs.__as(A, 'checkTeacherPin', ['1234']).ok, 'no PIN set: gear stays locked');
gs.__sheets.Settings.getRange(2, 2).setValue('4321');
ok(!gs.__as(A, 'checkTeacherPin', ['1111']).ok && gs.__as(A, 'checkTeacherPin', ['4321']).ok, 'PIN check: wrong refused, right accepted');
ok(!gs.__as(A, 'saveTeacherSettings', ['1111', { length: 'Quick' }]).ok, 'saving with a wrong PIN is refused');
let sv = gs.__as(A, 'saveTeacherSettings', ['4321', { length: '8', difficulty: 'Hard', rpp: '3', clock: '20', readAll: 'Yes' }]);
ok(sv.ok && sv.settings.length === '8' && sv.settings.ppq === 8 && sv.settings.difficulty === 'Hard' && sv.settings.rpp === 3 && sv.settings.clock === 20 && sv.settings.readAll && sv.settings.pinSet, 'settings saved (custom 8 plays, Hard, +3, 20 s clock, read aloud all)');
ok(tab('Settings')[2][1] === '8' && tab('Settings')[5][1] === '20' && tab('Settings')[6][1] === 'Yes' && tab('Settings')[1][1] === '4321', 'Settings tab values written, PIN kept');
gs.__as(A, 'saveTeacherSettings', ['4321', { length: 'Quick', difficulty: 'Normal', rpp: '2', clock: '0', readAll: 'No' }]);
ok(gs.__as(A, 'getStartupData').settings.length === 'Quick', 'settings saved back to Quick');
// Sign-up and backup codes
let reg = gs.__as(NEW, 'registerStudent', [5]);
ok(reg.ok && reg.student.period === '5' && reg.student.name === 'New Kid', 'student not on the Roster picks a period and is added');
ok(/^[A-Z2-9]{6}$/.test(tab('Roster')[3][7]), 'new student gets a backup code');
ok(gs.__as('', 'redeemBackupCode', ['bbb333']).email === B, 'backup code signs in the right student (any case)');
ok(!gs.__as(A, 'redeemBackupCode', ['BBB333']).ok, "a student cannot use someone else's code");
// Logging
gs.__as(A, 'logAnswers', [[{ time: Date.now(), email: 'ignored@x', set: 'Short set', tab: 'Short Tab', question: 'Short Q1?', teks: '113.41(c)(1)(A)', result: 'Right', accom: 'Read aloud, Reduced choices', guess: false, event: 'Offense huddle' }]]);
let r1 = tab('Results')[1];
ok(r1[1] === A && r1[2] === '3' && r1[5] === 'Short Q1?' && r1[7] === 'Right' && r1[8] === 'Read aloud, Reduced choices' && r1[9] === '' && r1.length === 11, 'answer row: Google email wins, period from Roster, 11 columns');
gs.__as(A, 'logGame', [{ set: 'Short set', difficulty: 'Hard', length: 'Quick', home: 21, away: 14, finished: true, plays: 24 }, A]);
let g1 = tab('Games')[1];
ok(g1[1] === A && g1[2] === 'Computer' && g1[3] === '3' && g1[5] === 'Solo' && g1[6] === 'Hard' && g1[8] === 'Pelicans 21, Comets 14' && g1[9] === A && g1[10] === 'Yes', 'solo game row: player, Computer, winner, finished');
gs.__sheets.Results.data.splice(1); gs.__sheets.Games.data.splice(1);

// ---------- Part 2: the game page calling Code.gs ----------
const html = fs.readFileSync(path.resolve('game/index.html'), 'utf8').replace('// HUDDLEUP_PAGE', '// HUDDLEUP_PAGE\nvar SERVER_TEST = false;');
const server = http.createServer((qq, rr) => { rr.writeHead(200, { 'Content-Type': 'text/html' }); rr.end(html); }).listen(0);
const FAKE_GAS = () => {
  const mk = (okh, fail) => new Proxy({}, { get: (_, fn) => fn === 'withSuccessHandler' ? h => mk(h, fail) : fn === 'withFailureHandler' ? h => mk(okh, h) : (...a) => window.gasCall(fn, JSON.stringify(a)).then(r => okh && okh(JSON.parse(r)), e => fail && fail(e)) });
  window.google = { script: { run: mk() } };
};
const bot = () => { window.botTimer = setInterval(() => {
  if (G.mode === 'call') { const b = $$('[data-call]'); if ($('[data-kick]')) $('[data-kick]').click(); else if (b.length) pick(b).click(); else if ($('#goFor')) $('#puntBtn').click(); }
  else if (G.mode === 'huddle') { if (!G.answered) { G.clockStart = -1e9; answer(Math.random() < .6 ? G.q.choices.findIndex(c => c.right) : (G.q.choices.findIndex(c => c.right) + 1) % G.q.choices.length); } else if ($('#hNext').offsetParent) $('#hNext').click(); }
  else if (G.mode === 'break') closeBreak();
  else if (G.mode === 'result' && $('#nextBtn')) $('#nextBtn').click();
}, 120); };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  async function student(email, query) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await ctx.exposeFunction('gasCall', (fn, args) => JSON.stringify(gs.__as(email, fn, JSON.parse(args))));
    await ctx.addInitScript(FAKE_GAS);
    const p = await ctx.newPage(); p.on('pageerror', e => { console.log('PAGE ERROR', email, e.message); fails++; });
    await p.goto(`http://localhost:${server.address().port}/${query || ''}`);
    return p;
  }
  // --- student A: signs in from the Roster, picks a set, plays, exits early ---
  const pa = await student(A);
  await pa.waitForSelector('#title.show');
  ok(/Coach Pat Tester · Period 3/.test(await pa.textContent('#who')), 'title shows the signed-in student');
  ok(!(await pa.isVisible('#optRA')) && !(await pa.isVisible('#optLen')), 'student link hides the test options');
  ok(await pa.evaluate(() => LENGTH === 'Quick' && PLAYS_PER_QUARTER === 6 && DIFF === 'Normal'), 'teacher settings from the Sheet are used');
  await pa.click('#kick');
  await pa.waitForSelector('#sets.show');
  ok((await pa.$$('[data-set]')).length === 2, 'two open sets: student picks one');
  await pa.click('[data-set="1"]');
  await pa.waitForFunction(() => G.started && G.mode === 'call');
  ok(await pa.evaluate(() => APP.set.name === 'Short set' && QUESTIONS.length === 4 && QUESTIONS[0].teks), 'questions loaded from the Short Tab');
  ok(await pa.evaluate(() => G.accom.reduced && G.accom.readAloud && !G.accom.extended), 'Roster accommodations on automatically');
  await pa.click('[data-kick="return"]');
  ok((await pa.$$('.choice')).length === 3, 'reduced choices: 3 answer choices');
  await pa.evaluate(() => { G.clockStart = -1e9; answer(G.q.choices.findIndex(c => c.right)); });
  await pa.screenshot({ path: out + '/s8-huddle.png' });
  await pa.evaluate(() => { $('#hNext').click(); });
  await pa.evaluate(bot); // a few more plays
  await pa.waitForFunction(() => G.log.length >= 9, null, { timeout: 120000 });
  await pa.evaluate(() => clearInterval(window.botTimer)); await pa.waitForTimeout(300);
  const answeredA = await pa.evaluate(() => G.log.length);
  await pa.evaluate(() => $$('[data-exit]').find(b => b.offsetParent).click());
  await pa.waitForTimeout(800);
  const resA = tab('Results').slice(1);
  ok(resA.length === answeredA && resA.every(r => r[1] === A && r[2] === '3' && r[3] === 'Short set' && r[4] === 'Short Tab'), `every answer reached Results (${resA.length} of ${answeredA}), with email, period and set`);
  ok(resA.every(r => r[8] === 'Read aloud, Reduced choices'), 'accommodations logged on every answer');
  ok(resA.some(r => /huddle/.test(r[10])), 'event tags logged (' + [...new Set(resA.map(r => r[10]))].join(', ') + ')');
  const gA = tab('Games').slice(1);
  ok(gA.length === 1 && gA[0][1] === A && gA[0][2] === 'Computer' && gA[0][10] === 'No' && /after \d+ plays/.test(gA[0][8]) && gA[0][9] === '', 'Exit / Start Over writes an unfinished game row: ' + gA[0][8]);
  ok(await pa.isVisible('#title'), 'back on the title screen');

  // --- teacher gear: PIN and play clock ---
  await pa.click('#gearBtn'); await pa.fill('#pinInput', '0000'); await pa.click('#pinBtn'); await pa.waitForTimeout(200);
  ok(/not right/.test(await pa.textContent('#pinMsg')), 'gear: wrong PIN refused');
  await pa.fill('#pinInput', '4321'); await pa.click('#pinBtn'); await pa.waitForSelector('#setCard', { state: 'visible' });
  ok(await pa.inputValue('#tLen') === 'Quick', 'gear: settings form shows the Sheet values');
  await pa.selectOption('#tClock', '15'); await pa.selectOption('#tLen', 'Custom'); await pa.fill('#tPlays', '4');
  await pa.screenshot({ path: out + '/s8-gear.png' });
  await pa.click('#tSave'); await pa.waitForFunction(() => /Saved/.test($('#tMsg').textContent));
  ok(tab('Settings')[5][1] === '15' && tab('Settings')[2][1] === '4', 'gear: play clock 15 and custom length 4 saved to the Settings tab');
  ok(await pa.evaluate(() => PLAY_CLOCK === 15 && PLAYS_PER_QUARTER === 4), 'gear: new settings used right away');
  await pa.click('#teacherBack');
  // play clock run-out
  await pa.click('#kick'); await pa.waitForSelector('#sets.show'); await pa.click('[data-set="0"]'); await pa.waitForFunction(() => G.started && G.mode === 'call');
  await pa.click('[data-kick="return"]'); await pa.waitForTimeout(300);
  const clk = await pa.evaluate(() => [getComputedStyle($('#hClock')).display, $('#hClock').textContent, G.clockLimit, G.mode]);
  ok(clk[0] !== 'none' && /^\d+s$/.test(clk[1]), 'play clock shows in the huddle: ' + clk.join(' '));
  await pa.evaluate(() => { G.clockStart = performance.now() - 16000; });
  await pa.waitForFunction(() => G.answered, null, { timeout: 3000 });
  ok(/Play clock ran out/.test(await pa.textContent('#fb')) && await pa.evaluate(() => G.log[G.log.length - 1].result === 'Wrong' && /play clock ran out/.test(G.log[G.log.length - 1].event)), 'clock runs out: counts as a missed answer and is logged');
  await pa.evaluate(() => $$('[data-exit]').find(b => b.offsetParent).click()); await pa.waitForTimeout(500);
  const pb0 = await student(B);
  await pb0.waitForSelector('#title.show');
  ok(await pb0.evaluate(() => PLAY_CLOCK === 15), 'extended-time student gets the play clock too...');
  await pb0.click('#kick'); await pb0.click('[data-set="0"]'); await pb0.waitForFunction(() => G.started && G.mode === 'call');
  await pb0.click('[data-kick="return"]');
  ok(await pb0.evaluate(() => G.clockLimit === 30), '...doubled to 30 seconds');
  await pb0.context().close();
  gs.__sheets.Settings.getRange(6, 2).setValue('Off'); gs.__sheets.Settings.getRange(3, 2).setValue('Quick');

  // --- new student: picks a period; no Google email: backup code ---
  const pn = await student('new.two@school.test');
  await pn.waitForSelector('#signin.show');
  ok(await pn.isVisible('#periodCard') && !(await pn.isVisible('#codeCard')), 'student not on the Roster is asked for a class period');
  await pn.click('[data-period="2"]'); await pn.waitForSelector('#title.show');
  ok(tab('Roster').some(r => r[0] === 'new.two@school.test' && r[2] === '2'), 'period saved to the Roster');
  await pn.context().close();
  const pc = await student('');
  await pc.waitForSelector('#signin.show');
  ok(await pc.isVisible('#codeCard'), 'no Google email: backup code screen');
  await pc.fill('#codeInput', 'zzzzzz'); await pc.click('#codeBtn'); await pc.waitForTimeout(200);
  ok(/not found/.test(await pc.textContent('#codeMsg')), 'wrong backup code refused');
  await pc.fill('#codeInput', 'bbb333'); await pc.click('#codeBtn'); await pc.waitForSelector('#title.show');
  ok(/Sam Sample/.test(await pc.textContent('#who')) && await pc.evaluate(() => playerEmail()) === B, 'backup code signs Sam in');
  await pc.context().close();

  // --- Head-to-Head: two students, one game row, both students' answers ---
  gs.__sheets.Results.data.splice(1); gs.__sheets.Games.data.splice(1);
  const h = await student(A), j = await student(B);
  await h.waitForSelector('#title.show'); await j.waitForSelector('#title.show');
  await h.click('#h2hBtn'); await h.waitForSelector('#sets.show'); await h.click('[data-set="1"]');
  await h.waitForFunction(() => /^[A-Z]{4}$/.test($('#netBig').textContent));
  const code = await h.textContent('#netBig');
  await j.click('#joinOpen'); await j.fill('#joinCode', code); await j.click('#joinBtn');
  await j.waitForFunction(() => G.net && G.started, null, { timeout: 8000 });
  ok(await j.evaluate(() => APP.set.name === 'Short set' && QUESTIONS.length === 4), 'joining coach gets the set the other coach picked');
  ok(await h.evaluate(() => G.accom.reduced) && await j.evaluate(() => !G.accom.reduced && G.accom.extended), "each coach keeps his or her own accommodations");
  await h.evaluate(bot); await j.evaluate(bot);
  await Promise.all([h, j].map(p => p.waitForFunction(() => G.mode === 'final', null, { timeout: 600000, polling: 1000 })));
  await h.waitForTimeout(1500);
  const logs = await Promise.all([h, j].map(p => p.evaluate(() => JSON.stringify(G.syncLog))));
  ok(logs[0] === logs[1], 'Head-to-Head game still matches on both screens');
  const gH = tab('Games').slice(1), score = await h.evaluate(() => [G.score.home, G.score.away]);
  ok(gH.length === 1, 'one Games row for the Head-to-Head game (both computers sent it)');
  ok(gH[0] && gH[0][1] === A && gH[0][2] === B && gH[0][5] === 'Head-to-Head' && gH[0][10] === 'Yes' && gH[0][8] === `Pelicans ${score[0]}, Comets ${score[1]}`, 'row: host, guest, mode, score, finished: ' + (gH[0] || []).join(' | '));
  ok(gH[0] && gH[0][9] === (score[0] > score[1] ? A : score[1] > score[0] ? B : 'Tie'), 'winner column: ' + (gH[0] || [])[9]);
  const rH = tab('Results').slice(1), na = await h.evaluate(() => G.log.length), nb = await j.evaluate(() => G.log.length);
  ok(rH.filter(r => r[1] === A).length === na && rH.filter(r => r[1] === B).length === nb, `all answers from both coaches logged (${na} + ${nb})`);
  ok(/Saved to the class Sheet/.test(await h.textContent('#saveNote')), 'final screen says the results are saved');
  await h.click('#copyBtn'); await h.waitForTimeout(300);
  const copied = await h.inputValue('#copyBox');
  ok(/Huddle Up results · Pat Tester · Period 3/.test(copied) && /Set: Short set · Head-to-Head/.test(copied) && /Final: Pelicans \d+, Comets \d+/.test(copied), 'Copy Results text:\n' + copied);
  await h.screenshot({ path: out + '/s8-final.png' });
  await browser.close(); server.close();

  // ---------- Part 3: reports ----------
  gs.__sheets.Goals.getRange(2, 1, 1, 3).setValues([[A, 'Pat Tester', '113.41(c)(1)(A)']]);
  gs.__as('', 'updateReports');
  const sum = tab('Summary');
  ok(sum && sum[0].join('|') === 'Student email|Student name|Class period|Questions answered|% correct|Games played|Class most-missed questions', 'Summary tab columns');
  ok(sum.some(r => r[0] === A && r[3] === na && r[5] === 1), 'Summary: questions answered and games played for Pat');
  const prog = tab('Progress Report');
  ok(prog && prog.slice(1).filter(r => r[0] === A).every(r => r[3] === '113.41(c)(1)(A)'), 'Progress Report: only IEP goal TEKS for a student with goals');
  ok(prog.slice(1).some(r => r[0] === B), 'Progress Report: all TEKS for a student without goals');
  const ov = tab('Class Overview');
  ok(ov && ov[0][0] === 'HUDDLE UP CLASS OVERVIEW' && ov.some(r => r[0] === 'PERIOD 3' && r[4] === 'Games: 2'), 'Class Overview: period block with games count');
  gs.__sheets['Student Report'].getRange(1, 2).setValue('3 - Pat Tester');
  const rep = gs.__as('', 'makeStudentReport');
  const sr = tab('Student Report');
  ok(rep.ok && sr.some(r => r[0] === 'GAMES') && sr.some(r => r[0] === 'Games played' && r[1] === 1) && sr.some(r => r[0] === '113.41(c)(1)(A)'), 'Student Report: IEP goal TEKS and GAMES section');
  fs.writeFileSync(out + '/s8-sheet.json', JSON.stringify(Object.fromEntries(Object.entries(gs.__sheets).map(([k, v]) => [k, v.rows()])), null, 1));
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('CRASH', e); process.exit(1); });
