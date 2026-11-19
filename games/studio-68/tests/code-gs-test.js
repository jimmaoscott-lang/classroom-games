const {makeEnv}=require('./gasmock');const assert=require('assert');
const E=makeEnv({code:require('path').join(__dirname,'../apps-script/Code.gs'),email:'teacher@x'});
E.setupTabs();console.log('tabs',Object.keys(E.sheets).join(', '));
E.setupTabs();console.log('second setup toast:',E.toasts.slice(-1)[0]);
console.log('sets',JSON.stringify(E.readSets_()),'radio',E.radioOpen_());
const q=E.getQuestions('Sample Vietnam Era');console.log('questions',q.questions.length,'w4 filled',q.questions.every(x=>x.w4));
// student signs up
E.email='jane.doe@x';let st=E.getStartupData();console.log('new student',JSON.stringify(st.student),'save',st.save);
let r=E.registerStudent(3);console.log('register',r.ok,r.student.period, 'roster row',JSON.stringify(E.sheets.Roster.data[1]));
// accommodations by teacher
E.sheets.Roster.data[1][3]='Yes';E.sheets.Roster.data[1][5]='x';
console.log('accom',JSON.stringify(E.readStudent_('jane.doe@x')));
// log answers
E.logAnswers([{time:Date.now(),set:'Sample',tab:'Sample Vietnam Era',difficulty:'Hard',question:'Q1',teks:'A.1, A.2',result:'Right',accom:'Read aloud',guess:false},
 {time:Date.now(),set:'Sample',tab:'Sample Vietnam Era',difficulty:'Easy',question:'Q2',teks:'A.1',result:'Wrong',accom:'',guess:true},
 {time:Date.now(),set:'Sample',tab:'Sample Vietnam Era',difficulty:'Medium',question:'Q2',teks:'A.1',result:'Wrong',accom:'',guess:false}]);
console.log('results row',JSON.stringify(E.sheets.Results.data[1].map(String)));
// save + read back
E.saveProgress({stage:'DJ Comet',records:7,packs:['folk','rock'],riffs:['f_dr1','r_dr1'],songs:[{name:'A B C',sel:{drums:'r_dr1'}}],data:{slot:1}},'');
E.saveProgress({stage:'DJ Comet',records:9,packs:['folk','rock'],riffs:['f_dr1','r_dr1'],songs:[],data:{}},'');
console.log('saves rows',E.sheets.Saves.getLastRow()-1,'read',JSON.stringify(E.readSave_('jane.doe@x')));
// play log
E.logPlay({song:'A B C',owner:'Own song',part:'Bass',level:'Easy',assists:'Slow speed, 2 lanes',accuracy:88,stars:4,score:1234});
console.log('plays row',JSON.stringify(E.sheets['Song Plays'].data[1].map(String)));
// radio off then on
console.log('share while off',JSON.stringify(E.shareSong({name:'A B C',sel:{drums:'r_dr1'},stage:'DJ Comet'},'')));
E.turnRadioOn();console.log('radio open',E.radioOpen_(),E.toasts.slice(-1)[0]);
console.log('share',JSON.stringify(E.shareSong({name:'A B C',sel:{drums:'r_dr1'},stage:'DJ Comet'},'')));
E.shareSong({name:'A B C',sel:{drums:'r_dr2'},stage:'DJ Comet'},'');
console.log('radio rows (same name replaces)',E.sheets.Radio.getLastRow()-1);
// classmate in period 3 and student in period 4
E.email='sam.lee@x';E.registerStudent(3);console.log('classmate sees',JSON.stringify(E.getRadio('')));
E.email='ana.ruiz@x';E.registerStudent(4);console.log('other period sees',E.getRadio('').songs.length);
E.sheets.Radio.data[1][6]='Yes';E.email='sam.lee@x';console.log('after hide',E.getRadio('').songs.length);
E.turnRadioOff();console.log('radio off getRadio',JSON.stringify(E.getRadio('')));
// backup codes
E.makeBackupCodes();const code=E.sheets.Roster.data[1][7];
E.email='';console.log('redeem',JSON.stringify(E.redeemBackupCode(code)).slice(0,160));
E.email='sam.lee@x';console.log('wrong owner',E.redeemBackupCode(code).error);
// code user (no google email) logs with email param
E.email='';E.logAnswers([{email:'jane.doe@x',set:'S',tab:'T',difficulty:'Easy',question:'Q3',teks:'A.2',result:'Right'}]);
console.log('code-user row email',E.sheets.Results.data[4][1],'period',E.sheets.Results.data[4][2]);
// reports
E.sheets.Goals.data[1]=['jane.doe@x','Jane','A.1',''];
E.updateReports();console.log(E.toasts.slice(-1)[0]);
console.log('summary',JSON.stringify(E.sheets.Summary.data.slice(0,3)));
console.log('progress',JSON.stringify(E.sheets['Progress Report'].data.slice(1)));
// new season
E.newSeason();console.log(E.toasts.slice(-1)[0],'saves left',E.sheets.Saves.getLastRow()-1,'radio left',E.sheets.Radio.getLastRow()-1,'results kept',E.sheets.Results.getLastRow()-1);
console.log('version check',E.checkGameVersion());
