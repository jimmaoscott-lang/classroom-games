// Class Overview + Student Report (Code.gs Build 2) against the in-memory Sheet
const {makeEnv}=require('./gasmock');const assert=require('assert');
const E=makeEnv({code:require('path').join(__dirname,'../apps-script/Code.gs'),email:'teacher@x'});
const txt=sh=>E.sheets[sh].data.map(r=>(r||[]).map(String).join(' | ').replace(/( \| )+$/,'')).join('\n');
E.setupTabs();
const set=E.sheets.Settings.data.map(r=>r[0]);
assert(set.includes('Report start date')&&set.includes('Report end date'),'date rows added');
assert(E.sheets['Student Report'],'Student Report tab made');
// Roster: 3 in period 2 (one never plays), 1 in period 10
E.sheets.Roster.data.push(['amy@x','Amy Adams','2','Yes','Yes','','',''],['bob@x','Bob Brown','2','','','','',''],
 ['cy@x','Cy Cole','2','','','','',''],['dee@x','Dee Diaz','10','','','Yes','','']);
const d=s=>new Date(s+'T15:00:00Z');
const R=(t,em,p,diff,q,teks,ok,acc,g)=>[d(t),em,p,'Set','Tab',diff,q,teks,ok?'Right':'Wrong',acc,g?'Yes':'',''];
E.sheets.Results.data.push(
 R('2026-10-01','amy@x','2','Easy','Q1','113.2(A)',false,'Read aloud',false),
 R('2026-10-01','amy@x','2','Easy','Q2','113.2(A)',true,'Read aloud',false),
 R('2026-10-01','amy@x','2','Easy','Q3','113.3(B)',false,'',true),
 R('2026-11-10','amy@x','2','Medium','Q1','113.2(A)',true,'Read aloud, Extended time',false),
 R('2026-11-10','amy@x','2','Medium','Q2','113.2(A)',true,'',false),
 R('2026-11-10','bob@x','2','Hard','Q1','113.2(A)',false,'',false),
 R('2026-11-10','bob@x','2','Hard','Q4','113.3(B)',false,'',true),
 R('2026-11-12','dee@x','10','Easy','Q9','113.4(C)',true,'Reduced choices',false),
 R('2026-11-12','zed@x','10','Easy','Q9','113.4(C)',false,'',false));   // not on Roster
E.sheets['Song Plays'].data.push([d('2026-11-10'),'amy@x','2','Song','Own','Bass','Easy','Slow speed, 2 lanes',80,4,900],
 [d('2026-11-11'),'amy@x','2','Song','Own','Lead','Easy','No-fail',90,5,1200],[d('2026-11-11'),'bob@x','2','S','Own','Bass','Easy','',50,2,10]);
E.sheets.Goals.data.push(['amy@x','Amy','113.2(A), 113.9(Z)','']);
E.updateReports();console.log(E.toasts.slice(-1)[0]);
const ov=txt('Class Overview');console.log('\n--- CLASS OVERVIEW (all dates) ---\n'+ov);
assert(ov.indexOf('PERIOD 2')<ov.indexOf('PERIOD 10'),'periods sorted by number');
assert(/PERIOD 2 \| Roster: 3 \| Played: 2 \| Not played: 1/.test(ov));
assert(/Not played yet: \| Cy Cole/.test(ov));
assert(/Class % correct \(guesses left out\): \| 60% \| Questions answered: \| 7/.test(ov),'P2: 3 of 5 scored');
assert(/Guess-flagged answers: \| Amy Adams \(1\), Bob Brown \(1\)/.test(ov));
assert(/1\) \| Q1  \(missed 2 of 3\)/.test(ov));
assert(!/Q3/.test(ov)&&!/Q4/.test(ov),'guessed answers left out of most-missed');
assert(/PERIOD 10 \| Roster: 1 \| Played: 2 \| Not played: 0/.test(ov),'off-roster student counted as played');
// dropdown
const v=E.sheets['Student Report'].validation;console.log('dropdown',JSON.stringify(v.list));
assert.deepStrictEqual(JSON.parse(JSON.stringify(v.list)),['2 - Amy Adams','2 - Bob Brown','2 - Cy Cole','10 - Dee Diaz']);
// no pick
let r=E.makeStudentReport();assert(!r.ok);console.log(E.toasts.slice(-1)[0]);
E.sheets['Student Report'].data[0][1]='2 - Amy Adams';
r=E.makeStudentReport();assert(r.ok);
let sr=txt('Student Report');console.log('\n--- STUDENT REPORT (all dates) ---\n'+sr);
assert(/Accommodations on Roster: Read aloud, Extended time/.test(sr));
assert(/Questions answered \| 5 \| % correct \(guesses left out\) \| 75% \| Guess-flagged answers \| 1/.test(sr));
assert(/Highest difficulty \| Medium \| Days played \| 2/.test(sr));
assert(/113\.2\(A\) \| 4 \| 75% \| 10\/1\/2026: 50% \| 11\/10\/2026: 100% \| \+50 points/.test(sr));
assert(/113\.9\(Z\) \| 0 \| - \| Not practiced yet/.test(sr));
assert(/10\/1\/2026 \(1\)/.test(sr));
assert(/Songs played \| 2 \| Average accuracy \| 85%/.test(sr)&&/Slow speed, 2 lanes, No-fail/.test(sr));
assert.strictEqual(E.sheets['Student Report'].data[0][1],'2 - Amy Adams','pick kept');
// date range: Nov only
const S=E.sheets.Settings.data;S.find(r=>r[0]==='Report start date')[1]=new Date('2026-11-01T12:00:00');
E.makeStudentReport();sr=txt('Student Report');console.log('\n--- STUDENT REPORT (from 11/1) ---\n'+sr);
assert(/Questions answered \| 5|Questions answered \| 2/.test(sr));
assert(/Questions answered \| 2 \| % correct \(guesses left out\) \| 100% \| Guess-flagged answers \| 0/.test(sr));
assert(/One day only/.test(sr));
assert(!/STUDENT REPORT[^\n]*\n[\s\S]*10\/1\/2026: 50%/.test(sr),'old rows cleared');
E.updateReports();const ov2=txt('Class Overview');
assert(/PERIOD 2 \| Roster: 3 \| Played: 2/.test(ov2)&&/Questions answered: \| 4/.test(ov2),'overview uses dates');
// Summary still all dates
assert.strictEqual(E.sheets.Summary.data.filter(r=>r[0]==='amy@x')[0][3],5,'Summary unfiltered');
// bad date
S.find(r=>r[0]==='Report end date')[1]='next week';E.makeStudentReport();console.log(E.toasts.slice(-1)[0]);
assert(/not a date/.test(E.toasts.slice(-1)[0]));
// student with no data / no goals
S.find(r=>r[0]==='Report end date')[1]='';E.sheets['Student Report'].data[0][1]='2 - Cy Cole';E.makeStudentReport();
sr=txt('Student Report');assert(/No IEP goal TEKS/.test(sr)&&/No answers in these dates/.test(sr)&&/Songs played \| 0/.test(sr));
// typed name not in list
E.sheets['Student Report'].data[0][1]='Nobody';r=E.makeStudentReport();assert(!r.ok);
assert.strictEqual(E.sheets['Student Report'].getLastRow(),1,'report area cleared');
// setup again does not duplicate date rows
E.setupTabs();assert.strictEqual(E.sheets.Settings.data.filter(r=>r[0]==='Report start date').length,1);
console.log('\nALL REPORT TESTS PASSED');
