
// ===== Studio '68 game page =====
var INDEX_VERSION = 'Build 1';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1);}
const QS=new URLSearchParams(location.search);

// ===== name word lists =====
const STAGE_PRE=['DJ','MC','Lil','Big','Captain','Professor','Doctor','Sir','Lady','The Amazing','King','Queen','Agent','Kid'];
const STAGE_WORD=['Comet','Groove','Thunder','Velvet','Echo','Rhythm','Static','Jukebox','Neon','Vinyl','Tempo','Breeze','Rocket','Lightning','Moonbeam','Cassette','Tambourine','Wildfire','Bluebird','Stardust'];
const NAME_A=['Electric','Golden','Midnight','Groovy','Cosmic','Rolling','Silver','Velvet','Wild','Lonely','Funky','Peaceful','Sunny','Restless','Psychedelic','Hometown'];
const NAME_B=['Highway','River','Thunder','Freedom','Sunshine','Rocket','Garden','Moon','Railroad','Dream','Fire','Avenue','Summer','Heartbeat','Radio','Canyon'];
const NAME_C=['Blues','Boogie','Shuffle','Stomp','Ballad','Groove','Jam','Anthem','Serenade','Rag','Waltz','Twist','Soul','Song','Rock','Funk'];
function pick(a){return a[Math.floor(Math.random()*a.length)];}
function randomSongName(){return pick(NAME_A)+' '+pick(NAME_B)+' '+pick(NAME_C);}

// ===== levels and rules =====
const LEVELS={easy:{name:'Easy',choices:3,pay:1},medium:{name:'Medium',choices:4,pay:1},hard:{name:'Hard',choices:5,pay:2}};
const EXTENDED_TIME=1.5;
const SPEEDS={slow:2.4,normal:1.7,fast:1.25};
const ALL_IDS=RIFFS.map(r=>r.id);

// ===== app state =====
const APP={startup:null,student:{},email:'',codeEmail:'',sets:[],set:null,diff:'medium',radioOpen:false,
 audioBases:['https://cdn.jsdelivr.net/gh/jimmaoscott-lang/classroom-games@main/games/studio-68/audio/',
  'https://raw.githubusercontent.com/jimmaoscott-lang/classroom-games/main/games/studio-68/audio/'],
 questions:[],tab:'',deck:[],q:null,answered:false,correct:0,total:0,wrongRun:[],flags:0,lockUntil:0,clockStart:0,
 accom:{readAloud:false,extended:false,reduced:false}};
const ST={stage:'',records:0,packs:new Set(['folk']),riffs:new Set(RIFFS.filter(r=>r.cost===0).map(r=>r.id)),
 songs:[],slot:0,tab:'folk',data:{noRecord:false,crowdHalf:false,earned:0}};

function hasServer(){return typeof google!=='undefined'&&google.script&&google.script.run;}
function playerEmail(){return APP.codeEmail||APP.email||'';}

// ===== preview backend (used when the page is opened outside Apps Script) =====
const PREVIEW={
 store(k,v){try{if(v===undefined)return JSON.parse(localStorage.getItem('st68_'+k)||'null');localStorage.setItem('st68_'+k,JSON.stringify(v));}catch(e){return null;}},
 getStartupData(){const audio=QS.get('audio');return {email:'preview',preview:true,
  student:{onRoster:true,name:'Preview Student',period:'1',readAloud:QS.get('ra')==='1',extended:QS.get('et')==='1',reduced:QS.get('rc')==='1'},
  sets:[{number:1,name:'Sample: Vietnam Era',questionTab:'Sample Vietnam Era'}],save:this.store('save'),radioOpen:QS.get('radio')!=='0',
  audioBases:audio?[audio]:null,version:'preview'};},
 getQuestions(tab){return {tab,error:'',questions:SAMPLE_QUESTIONS.map(r=>({q:r[0],a:r[1],w:[r[2],r[3],r[4]],w4:r[5],tag:r[6],teks:r[7]}))};},
 logAnswers(rows){(window.__log=window.__log||[]).push(...rows);return rows.length;},
 logPlay(r){(window.__plays=window.__plays||[]).push(r);return 1;},
 saveProgress(s){this.store('save',s);window.__saves=(window.__saves||0)+1;return {ok:true};},
 getRadio(){const mine=this.store('radio')||[];
  const demo=[{id:'d1',stage:'DJ Comet',name:'Cosmic Railroad Boogie',sel:{drums:'r_dr1',bass:'r_bs2',rhythm:'r_rh1',lead:'r_ld1'}},
   {id:'d2',stage:'Lady Velvet',name:'Velvet Moon Soul',sel:{drums:'m_dr1',bass:'m_bs1',rhythm:'m_rh1',lead:'m_ld2'}}];
  return {open:true,songs:mine.concat(demo)};},
 shareSong(song){const mine=(this.store('radio')||[]).filter(s=>s.name!==song.name);mine.unshift({id:'m'+Date.now(),stage:song.stage,name:song.name,sel:song.sel,mine:true});this.store('radio',mine);return {ok:true};},
 registerStudent(){return {ok:true,student:this.getStartupData().student};},
 redeemBackupCode(){return {ok:false,error:'Backup codes only work in the real game.'};}
};
function call(fn,...args){
 return new Promise((resolve,reject)=>{
  if(!hasServer()){try{resolve(PREVIEW[fn](...args));}catch(e){reject(e);}return;}
  google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)[fn](...args);
 });
}

// ===== audio engine =====
const BPM=100, STEP=60/BPM/2, CYCLE_STEPS=16, CYCLE=STEP*CYCLE_STEPS;
const NOTE_IDX={C:0,Cs:1,D:2,Ds:3,E:4,F:5,Fs:6,G:7,Gs:8,A:9,As:10,B:11};
function midi(n){const m=n.match(/^([A-G]s?)(\d)$/);return NOTE_IDX[m[1]]+12*(+m[2]+1);}
const ROLES=[{k:'drums',label:'Drums',when:'Plays the whole song'},{k:'bass',label:'Bass',when:'Joins at verse 1'},{k:'rhythm',label:'Rhythm',when:'Plays the whole song'},{k:'lead',label:'Lead',when:'Choruses and outro'}];
const INST_NAME={cbs:'Upright bass',gac:'Acoustic guitar',hrm:'Harmonica',bel:'Electric bass',gel:'Electric guitar',org:'Organ',pno:'Piano',sax:'Saxophone',tpt:'Trumpet',vln:'Fiddle',flt:'Flute',sub:'808 bass',syn:'Synth bass',pad:'Synth chords',ldr:'Synth lead',drums:'Drum kit'};
const SECTIONS=[
 {name:'Intro',cycles:1,roles:['drums','rhythm']},
 {name:'Verse 1',cycles:2,roles:['drums','bass','rhythm']},
 {name:'Chorus',cycles:2,roles:['drums','bass','rhythm','lead']},
 {name:'Verse 2',cycles:2,roles:['drums','bass','rhythm']},
 {name:'Chorus',cycles:2,roles:['drums','bass','rhythm','lead']},
 {name:'Outro',cycles:1,roles:['drums','bass','rhythm','lead']},
];
const TOTAL_CYCLES=SECTIONS.reduce((a,s)=>a+s.cycles,0);
const VOL={drums:0.8,bass:0.95,rhythm:0.5,lead:0.7};
const SYNTH_FALLBACK={cbs:'syn',bel:'syn',gac:'pad',gel:'pad',pno:'pad',org:'pad',hrm:'ldr',sax:'ldr',tpt:'ldr',vln:'ldr',flt:'ldr'};
function stepT(s,swing){return s*STEP+(swing&&s%2===1?STEP*0.33:0);}

let ctx,master,noiseBuf,audioReady=false;
const SAMP={},LOADING={},FAILED={};
let audioBase=null;
function initAudio(){
 if(ctx)return;
 ctx=new (window.AudioContext||window.webkitAudioContext)();
 master=ctx.createGain();master.gain.value=0.8;
 const comp=ctx.createDynamicsCompressor();master.connect(comp);comp.connect(ctx.destination);
 noiseBuf=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
 audioReady=true;
}
async function fetchBuf(url,ms){
 const ctl=window.AbortController?new AbortController():null;const timer=setTimeout(()=>ctl&&ctl.abort(),ms);
 try{const r=await fetch(url,ctl?{signal:ctl.signal}:{});if(!r.ok)throw new Error('HTTP '+r.status);return await r.arrayBuffer();}
 finally{clearTimeout(timer);}
}
function decode(buf){return new Promise((res,rej)=>{const p=ctx.decodeAudioData(buf,res,rej);if(p&&p.then)p.then(res,rej);});}
async function loadInstFrom(inst,base){
 const notes=SAMPLE_LIST[inst];
 const list=await Promise.all(notes.map(async n=>({m:midi(n),buf:await decode(await fetchBuf(base+inst+'-'+n+'.mp3',9000))})));
 return list.sort((a,b)=>a.m-b.m);
}
function loadInst(inst){
 if(!SAMPLE_LIST[inst]||SAMP[inst]||FAILED[inst])return Promise.resolve();
 if(LOADING[inst])return LOADING[inst];
 LOADING[inst]=(async()=>{
  const bases=audioBase?[audioBase].concat(APP.audioBases.filter(b=>b!==audioBase)):APP.audioBases;
  for(const base of bases){
   try{SAMP[inst]=await loadInstFrom(inst,base);audioBase=base;return;}catch(e){/* try the next address */}
  }
  FAILED[inst]=true;showAudioNote();
 })();
 return LOADING[inst];
}
function showAudioNote(){const n=Object.keys(FAILED).length;$('#audioNote').textContent=n?'Some instrument sounds could not load, so built-in synth sounds are standing in. The game still works.':'';}
function instsFor(sel){return [...new Set(Object.values(sel).filter(Boolean).map(id=>RIFF[id]&&RIFF[id].inst).filter(Boolean))];}
function ensureSel(sel){return Promise.all(instsFor(sel).map(loadInst));}
function ensurePack(g){return Promise.all([...new Set(RIFFS.filter(r=>r.genre===g&&r.inst).map(r=>r.inst))].map(loadInst));}

function makeBus(){
 const bus=ctx.createGain();bus.connect(master);
 const fuzz=ctx.createWaveShaper();const c=new Float32Array(1024);for(let i=0;i<1024;i++){const x=i/512-1;c[i]=Math.tanh(3.5*x);}fuzz.curve=c;
 const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=3200;
 const fg=ctx.createGain();fg.gain.value=0.55;fuzz.connect(lp);lp.connect(fg);fg.connect(bus);
 return {bus,gel:fuzz};
}
function playSample(inst,m,t,dur,vel,B){
 const list=SAMP[inst];let best=list[0];for(const s of list)if(Math.abs(s.m-m)<Math.abs(best.m-m))best=s;
 const src=ctx.createBufferSource();src.buffer=best.buf;src.playbackRate.value=Math.pow(2,(m-best.m)/12);
 const sustain=['org','hrm','sax','tpt','vln','flt'].includes(inst);
 if(sustain&&dur>1.2){src.loop=true;src.loopStart=0.4;src.loopEnd=1.2;}
 const g=ctx.createGain();const rel=sustain?0.12:0.35;
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vel,t+0.008);
 g.gain.setValueAtTime(vel,t+dur);g.gain.linearRampToValueAtTime(0,t+dur+rel);
 src.connect(g);g.connect(inst==='gel'?B.gel:B.bus);src.start(t);src.stop(t+dur+rel+0.05);
}
function playSynth(inst,m,t,dur,vel,B){
 const f=440*Math.pow(2,(m-69)/12);const g=ctx.createGain();g.connect(B.bus);
 const oscs=[];const mk=(type,fr,gain,dest)=>{const o=ctx.createOscillator();o.type=type;o.frequency.value=fr;const og=ctx.createGain();og.gain.value=gain;o.connect(og);og.connect(dest);oscs.push(o);return o;};
 let rel=0.12,peak=vel;
 if(inst==='sub'){const o=mk('sine',f,1,g);mk('triangle',f*2,0.3,g);o.frequency.setValueAtTime(f*1.5,t);o.frequency.exponentialRampToValueAtTime(f,t+0.05);peak=vel*1.1;rel=0.2;}
 else{const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.connect(g);
  if(inst==='syn'){mk('sawtooth',f,0.6,lp);mk('square',f/2,0.4,lp);lp.Q.value=6;lp.frequency.setValueAtTime(2200,t);lp.frequency.exponentialRampToValueAtTime(400,t+0.18);peak=vel*0.7;rel=0.06;}
  else if(inst==='pad'){mk('sawtooth',f*1.004,0.5,lp);mk('sawtooth',f*0.996,0.5,lp);lp.frequency.setValueAtTime(3500,t);lp.frequency.exponentialRampToValueAtTime(1200,t+0.25);peak=vel*0.45;rel=0.15;}
  else{mk('square',f,0.5,lp);mk('sawtooth',f*2.002,0.2,lp);lp.frequency.value=2800;peak=vel*0.32;rel=0.08;}}
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+0.008);
 if(inst==='sub'){g.gain.setTargetAtTime(peak*0.6,t+0.05,0.3);}
 g.gain.setValueAtTime(inst==='sub'?peak*0.5:peak,t+dur);g.gain.linearRampToValueAtTime(0,t+dur+rel);
 oscs.forEach(o=>{o.start(t);o.stop(t+dur+rel+0.05);});
}
function playOne(inst,m,t,dur,vel,B){if(SAMP[inst])playSample(inst,m,t,dur,vel,B);else playSynth(SYNTH_FALLBACK[inst]||inst,m,t,dur,vel,B);}
function playChordOrNote(inst,n,t,dur,vel,B){
 if(Array.isArray(n)){const v=vel/Math.sqrt(n.length)*1.2;n.forEach((x,i)=>playOne(inst,midi(x),t+(inst==='pad'||inst==='pno'?0:i*0.012),dur,v,B));}
 else playOne(inst,midi(n),t,dur,vel,B);
}
function noise(t,dur,type,freq,vel,B,q){const s=ctx.createBufferSource();s.buffer=noiseBuf;const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=freq;if(q)f.Q.value=q;
 const g=ctx.createGain();g.gain.setValueAtTime(vel,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);s.connect(f);f.connect(g);g.connect(B.bus);s.start(t);s.stop(t+dur+0.02);}
function tone(type,f0,f1,t,dur,vel,B){const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+dur*0.5);
 g.gain.setValueAtTime(vel,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);o.connect(g);g.connect(B.bus);o.start(t);o.stop(t+dur+0.02);}
function drum(kind,t,vel,B){
 if(kind==='k')tone('sine',130,42,t,0.35,vel*1.1,B);
 else if(kind==='s'){noise(t,0.18,'bandpass',1800,vel*0.9,B,0.7);tone('triangle',190,0,t,0.1,vel*0.5,B);}
 else if(kind==='b'){noise(t,0.22,'bandpass',2500,vel*0.35,B,0.5);}
 else if(kind==='h'){noise(t,0.05,'highpass',7500,vel*0.25,B);}
 else if(kind==='t'){noise(t,0.12,'highpass',6500,vel*0.3,B);noise(t+0.03,0.08,'highpass',8000,vel*0.15,B);}
 else if(kind==='c'){noise(t,1.2,'highpass',5000,vel*0.35,B);}
 else if(kind==='K')tone('sine',110,48,t,0.7,vel*1.2,B);
 else if(kind==='p'){for(const d of [0,0.012,0.024])noise(t+d,0.12,'bandpass',1400,vel*0.6,B,1.2);}
 else if(kind==='r'){noise(t,0.04,'bandpass',3000,vel*0.6,B,3);tone('sine',420,0,t,0.05,vel*0.3,B);}
 else if(kind==='o'){noise(t,0.25,'highpass',7000,vel*0.25,B);}
 else if(kind==='x'){noise(t,0.04,'highpass',8000,vel*0.2,B);noise(t+STEP/2,0.04,'highpass',8000,vel*0.14,B);}
 else if(kind==='R'){noise(t,0.45,'bandpass',6500,vel*0.3,B,1.5);tone('square',3200,0,t,0.4,vel*0.03,B);}
}
function scheduleRiff(riff,cycleStart,B,vol){
 if(riff.drums){for(const kind in riff.drums)for(const s of riff.drums[kind])for(const bar of [0,8])drum(kind,cycleStart+stepT(bar+s,riff.swing),vol,B);return;}
 for(const [s,len,n] of riff.notes)playChordOrNote(riff.inst,n,cycleStart+stepT(s,riff.swing),len*STEP,vol,B);
}
function songLayout(){const out=[];let c=0;for(const sec of SECTIONS){for(let i=0;i<sec.cycles;i++){out.push({cycle:c,roles:sec.roles,name:sec.name});c++;}}return out;}
function scheduleSong(sel,t0,B,skipRole){
 for(const cy of songLayout()){const cs=t0+cy.cycle*CYCLE;
  for(const role of cy.roles){if(role===skipRole)continue;const id=sel[role];if(!id||!RIFF[id])continue;scheduleRiff(RIFF[id],cs,B,VOL[role]);}}
 const end=t0+TOTAL_CYCLES*CYCLE;
 if(sel.drums){drum('k',end,0.9,B);drum('c',end,1,B);}
 if(sel.bass&&RIFF[sel.bass]&&skipRole!=='bass')playChordOrNote(RIFF[sel.bass].inst,'E2',end,1.6,0.9,B);
 if(sel.rhythm&&RIFF[sel.rhythm]&&skipRole!=='rhythm'){const r=RIFF[sel.rhythm];const fc=r.notes.find(x=>Array.isArray(x[2]));playChordOrNote(r.inst,fc?fc[2]:'E3',end,1.8,0.5,B);}
 return end;
}
let current=null;
function stopAll(){
 if(current){try{const b=current.B.bus;b.gain.setTargetAtTime(0,ctx.currentTime,0.03);setTimeout(()=>b.disconnect(),300);}catch(e){}clearTimeout(current.timer);current=null;}
 $$('.audition.playing').forEach(b=>{b.classList.remove('playing');b.textContent='▶';});
 const pb=$('#previewBtn');if(pb){pb.classList.remove('playing');pb.textContent='▶ Preview full song';}
}
async function audition(id,btn){
 if(btn.classList.contains('playing')){stopAll();return;}
 stopAll();btn.textContent='…';btn.disabled=true;
 await loadInst(RIFF[id].inst);btn.disabled=false;
 stopAll();master.gain.value=0.8;
 const B=makeBus();const t=ctx.currentTime+0.1;const r=RIFF[id];
 scheduleRiff(r,t,B,VOL[r.role]);scheduleRiff(r,t+CYCLE,B,VOL[r.role]);
 btn.classList.add('playing');btn.textContent='■';current={B,timer:setTimeout(stopAll,CYCLE*2*1000+400)};
}
async function previewSong(){
 const pb=$('#previewBtn');
 if(pb.classList.contains('playing')){stopAll();return;}
 stopAll();pb.textContent='Loading...';await ensureSel(song().sel);
 master.gain.value=0.8;
 const B=makeBus();const t0=ctx.currentTime+0.15;const end=scheduleSong(song().sel,t0,B,null);
 pb.classList.add('playing');pb.textContent='■ Stop preview';
 current={B,timer:setTimeout(stopAll,(end-ctx.currentTime+2)*1000)};
}

// ===== read aloud =====
let speechToken=0;
function speak(text,onDone){
 const token=++speechToken;
 const done=()=>{if(token===speechToken&&onDone)onDone();};
 if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){done();return;}
 try{
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);u.rate=0.95;
  u.onend=done;u.onerror=done;
  speechSynthesis.speak(u);
  // safety: if the voice never reports back, start the clock after a fair reading time
  setTimeout(done,(2+text.split(/\s+/).length*0.5)*1000);
 }catch(e){done();}
}
function stopSpeech(){speechToken++;try{window.speechSynthesis&&speechSynthesis.cancel();}catch(e){}}

// ===== screens =====
function show(id){$$('.screen').forEach(s=>s.classList.toggle('active',s.id===id));}
function modal(id,on){$('#'+id).style.display=on?'flex':'none';}

// ===== startup and sign-in =====
function startup(){
 call('getStartupData').then(onStartup).catch(err=>{
  $('#loadMsg').textContent='The game could not reach the class Sheet ('+String(err)+'). Reload the page to try again.';
 });
}
function onStartup(data){
 APP.startup=data;APP.email=data.email||'';APP.student=data.student||{};APP.sets=data.sets||[];APP.radioOpen=!!data.radioOpen;
 if(data.audioBases&&data.audioBases.length)APP.audioBases=data.audioBases;
 loadSave(data.save);
 if(hasServer()&&!APP.email){showSignin(false);return;}
 if(hasServer()&&!String(APP.student.period||'').trim()){showSignin(true);return;}
 showSetPick();
}
function showSignin(needPeriod){
 $('#periodCard').style.display=needPeriod?'block':'none';
 $('#codeCard').style.display=needPeriod?'none':'block';
 const grid=$('#periodGrid');grid.innerHTML='';
 for(let p=1;p<=8;p++){const b=document.createElement('button');b.textContent=p;b.onclick=()=>choosePeriod(p);grid.appendChild(b);}
 show('signin');
}
function choosePeriod(p){
 const btns=$$('#periodGrid button');btns.forEach(b=>b.disabled=true);$('#periodMsg').textContent='Saving period '+p+'...';
 call('registerStudent',p).then(res=>{
  if(!res||!res.ok){$('#periodMsg').textContent=(res&&res.error)||'Could not save your period. Try again.';btns.forEach(b=>b.disabled=false);return;}
  APP.student=res.student;showSetPick();
 }).catch(err=>{$('#periodMsg').textContent='Could not save your period ('+err+'). Try again.';btns.forEach(b=>b.disabled=false);});
}
function redeemCode(){
 const code=$('#codeInput').value.trim();$('#codeMsg').textContent='Checking...';$('#codeBtn').disabled=true;
 call('redeemBackupCode',code).then(res=>{
  $('#codeBtn').disabled=false;
  if(!res||!res.ok){$('#codeMsg').textContent=(res&&res.error)||'That code did not work.';return;}
  APP.codeEmail=res.email;APP.student=res.student;loadSave(res.save);showSetPick();
 }).catch(err=>{$('#codeBtn').disabled=false;$('#codeMsg').textContent='Could not check the code ('+err+').';});
}

// ===== saves =====
function defaultSong(){return {name:randomSongName(),sel:{drums:'f_dr1',bass:'f_bs1',rhythm:'f_rh1',lead:null}};}
function loadSave(s){
 if(!s)s={};
 ST.stage=s.stage||'';ST.records=Math.max(0,Number(s.records)||0);
 ST.packs=new Set(['folk'].concat(s.packs||[]).filter(g=>GENRE[g]));
 ST.riffs=new Set(RIFFS.filter(r=>r.cost===0).map(r=>r.id).concat((s.riffs||[]).filter(id=>RIFF[id])));
 const songs=Array.isArray(s.songs)?s.songs:[];
 ST.songs=[0,1,2].map(i=>{const x=songs[i];if(!x||!x.sel)return defaultSong();
  const sel={};for(const r of ['drums','bass','rhythm','lead']){const id=x.sel[r];sel[r]=id&&ST.riffs.has(id)?id:null;}
  if(!sel.drums)sel.drums='f_dr1';if(!sel.bass)sel.bass='f_bs1';if(!sel.rhythm)sel.rhythm='f_rh1';
  return {name:String(x.name||randomSongName()),sel};});
 const d=s.data||{};
 ST.slot=Math.min(2,Math.max(0,Number(d.slot)||0));
 ST.data={noRecord:!!d.noRecord,crowdHalf:!!d.crowdHalf,earned:Number(d.earned)||0};
}
function saveObj(){return {stage:ST.stage,records:ST.records,packs:[...ST.packs],riffs:[...ST.riffs],songs:ST.songs,
 data:{slot:ST.slot,noRecord:ST.data.noRecord,crowdHalf:ST.data.crowdHalf,earned:ST.data.earned}};}
let saveTimer=null,saving=false,saveAgain=false;
function queueSave(){clearTimeout(saveTimer);$('#saveNote').textContent='Saving...';saveTimer=setTimeout(doSave,1200);}
function doSave(){
 if(saving){saveAgain=true;return;}
 saving=true;
 call('saveProgress',saveObj(),playerEmail()).then(res=>{
  saving=false;$('#saveNote').textContent=res&&res.ok?'Saved':'Not saved';
  if(saveAgain){saveAgain=false;doSave();}
 }).catch(()=>{saving=false;$('#saveNote').textContent='Not saved, retrying...';saveTimer=setTimeout(doSave,8000);});
}
function song(){return ST.songs[ST.slot];}

// ===== set and level pick =====
function fillSelect(el,list,val){el.innerHTML=list.map(x=>'<option'+(x===val?' selected':'')+'>'+esc(x)+'</option>').join('');}
function showSetPick(){
 APP.accom={readAloud:!!APP.student.readAloud,extended:!!APP.student.extended,reduced:!!APP.student.reduced};
 const grid=$('#setGrid');grid.innerHTML='';
 if(!APP.sets.length)$('#setMsg').textContent='No review sets are open yet. Your teacher opens them in the Sets tab.';
 APP.sets.forEach((s,i)=>{const b=document.createElement('button');b.textContent=s.name;b.onclick=()=>{APP.set=s;$$('#setGrid button').forEach(x=>x.classList.toggle('on',x===b));};grid.appendChild(b);
  if(APP.set?APP.set.questionTab===s.questionTab:i===0){APP.set=s;b.classList.add('on');}});
 $$('#levelGrid button').forEach(b=>{b.classList.toggle('on',b.dataset.d===APP.diff);b.onclick=()=>{APP.diff=b.dataset.d;$$('#levelGrid button').forEach(x=>x.classList.toggle('on',x===b));};});
 if(APP.accom.reduced){$('#levelGrid [data-d=easy] span').textContent='2 choices · 1 record';$('#levelGrid [data-d=medium] span').textContent='3 choices · 1 record';$('#levelGrid [data-d=hard] span').textContent='3 choices · 2 records';
  $('#reducedNote').textContent='Reduced choices is on for you, so some wrong answers are already crossed out.';}
 const parts=(ST.stage||'').split(' ');const word=parts.pop();const pre=parts.join(' ');
 fillSelect($('#stagePre'),STAGE_PRE,STAGE_PRE.includes(pre)?pre:pick(STAGE_PRE));
 fillSelect($('#stageWord'),STAGE_WORD,STAGE_WORD.includes(word)?word:pick(STAGE_WORD));
 $('#stageSpeak').style.display=APP.accom.readAloud?'':'none';
 $('#enterBtn').disabled=false;$('#enterMsg').textContent='';
 show('setpick');
}
async function enterStudio(){
 if(!APP.set){$('#enterMsg').textContent='Pick a review set first.';return;}
 const btn=$('#enterBtn');btn.disabled=true;$('#enterMsg').textContent='Tuning instruments...';
 const newStage=$('#stagePre').value+' '+$('#stageWord').value;const changed=newStage!==ST.stage;ST.stage=newStage;
 try{initAudio();if(ctx.state==='suspended')await ctx.resume();}catch(e){}
 const loads=Promise.all([ensurePack('folk'),ensureSel(song().sel)]);
 let res;
 try{res=await call('getQuestions',APP.set.questionTab);}catch(err){res={error:'Could not load questions ('+err+').',questions:[]};}
 if(res.error||!res.questions.length){$('#enterMsg').textContent=res.error||'No questions found.';btn.disabled=false;return;}
 APP.questions=res.questions;APP.tab=res.tab;APP.deck=[];APP.correct=0;APP.total=0;APP.wrongRun=[];APP.flags=0;
 await Promise.race([loads,new Promise(r=>setTimeout(r,8000))]);
 if(changed)queueSave();
 enterStudioScreen();
}
function enterStudioScreen(){
 $('#whoLine').textContent=ST.stage;
 $('#setLine').textContent=APP.set.name+' · '+LEVELS[APP.diff].name;
 $('#qSpeak').style.display=APP.accom.readAloud?'':'none';
 $$('.readOnly').forEach(b=>b.style.display=APP.accom.readAloud?'':'none');
 show('studio');renderStudio();nextQuestion();
}

// ===== questions =====
function countWords(s){s=String(s||'').trim();return s?s.split(/\s+/).length:0;}
function choiceCount(src){
 let n=LEVELS[APP.diff].choices;
 if(APP.diff==='hard'&&!src.w4)n=4;
 if(APP.accom.reduced)n=Math.min(n,APP.diff==='easy'?2:3);
 const avail=1+src.w.filter(w=>w&&w!==src.a).length+(APP.diff==='hard'&&src.w4?1:0);
 return Math.max(2,Math.min(n,avail));
}
function nextQuestion(){
 if(!APP.deck.length)APP.deck=shuffle(APP.questions.map((_,i)=>i));
 const src=APP.questions[APP.deck.pop()];
 let pool=src.w.slice();if(APP.diff==='hard'&&src.w4)pool.push(src.w4);
 pool=shuffle(pool.filter(w=>w&&w!==src.a));
 const n=choiceCount(src);
 const choices=shuffle([{text:src.a,right:true}].concat(pool.slice(0,n-1).map(w=>({text:w,right:false}))));
 APP.q={src,choices,shownAt:performance.now()};APP.answered=false;
 $('#qNum').textContent='Question '+(APP.total+1);$('#qText').textContent=src.q;
 const box=$('#choices');box.innerHTML='';
 choices.forEach((c,i)=>{const b=document.createElement('button');b.className='choice';b.innerHTML='<span class="letter">'+'ABCDE'[i]+'</span><span>'+esc(c.text)+'</span>';
  b.onclick=()=>answer(i);box.appendChild(b);});
 $('#feedback').className='feedback';$('#feedback').innerHTML='';$('#nextQ').style.display='none';
 APP.clockStart=performance.now();
 if(APP.accom.readAloud){APP.clockStart=Infinity;readQuestion();}
 updateStats();
}
function questionSpeech(){const q=APP.q;return q.src.q+'. '+q.choices.map((c,i)=>'ABCDE'[i]+'. '+c.text).join('. ');}
function readQuestion(){if(!APP.q)return;const q=APP.q;speak(questionSpeech(),()=>{if(APP.q===q&&APP.clockStart===Infinity)APP.clockStart=performance.now();});}
function minReadSeconds(){
 let words=countWords(APP.q.src.q);APP.q.choices.forEach(c=>words+=countWords(c.text));
 let secs=1+0.25*words;if(APP.accom.extended)secs*=EXTENDED_TIME;return secs;
}
function accomText(){const a=[];if(APP.accom.readAloud)a.push('Read aloud');if(APP.accom.extended)a.push('Extended time');if(APP.accom.reduced)a.push('Reduced choices');return a.join(', ');}
function answer(i){
 if(APP.answered||!APP.q||performance.now()<APP.lockUntil)return;
 APP.answered=true;stopSpeech();
 const q=APP.q,c=q.choices[i],ok=c.right;
 const elapsed=APP.clockStart===Infinity?0:(performance.now()-APP.clockStart)/1000;
 const fast=elapsed<minReadSeconds();
 APP.total++;
 const entry={time:Date.now(),question:q.src.q,teks:q.src.teks,result:ok?'Right':'Wrong',guess:false,event:''};
 logEvent(entry);
 const btns=$$('#choices .choice');btns.forEach(b=>b.disabled=true);
 btns[i].classList.add(ok?'right':'wrong');
 let fb='';
 if(ok){
  APP.correct++;APP.wrongRun=[];
  const pay=LEVELS[APP.diff].pay;
  if(ST.data.noRecord){ST.data.noRecord=false;fb='<b>Correct!</b> No record this time because of guessing. The next one counts.';}
  else{ST.records+=pay;ST.data.earned+=pay;fb='<b>Correct! +'+pay+' gold record'+(pay>1?'s':'')+'.</b>';bumpRecords();}
  $('#feedback').className='feedback good';
 }else{
  btns[q.choices.findIndex(x=>x.right)].classList.add('right');
  APP.wrongRun.push({fast,pos:i,entry});
  fb='<b>Not quite.</b> The correct answer is: '+esc(q.src.a);
  $('#feedback').className='feedback bad';
  const g=checkGuessing();if(g)fb+='<br>'+g;
 }
 $('#feedback').innerHTML=fb;
 flushLog(false);queueSave();renderStudio();updateStats();
 $('#nextQ').style.display='inline-block';
 if(APP.accom.readAloud)speak((ok?'Correct. ':'Not quite. The correct answer is: '+q.src.a));
}
function checkGuessing(){
 const run=APP.wrongRun;if(run.length<3)return '';
 const last=run.slice(-3);
 const allFast=last.every(w=>w.fast),samePos=last.every(w=>w.pos===last[0].pos);
 if(!allFast&&!samePos)return '';
 last.forEach(w=>w.entry.guess=true);
 APP.wrongRun=[];APP.flags++;
 const msg='The producer is checking your work...';
 if(APP.flags===1){lockFor(5,'Slow down and read each question. '+msg);return 'Slow down and read each question.';}
 if(APP.flags===2){ST.data.noRecord=true;lockFor(10,msg+' Your next correct answer earns no record.');return 'Your next correct answer earns no record.';}
 ST.data.crowdHalf=true;lockFor(15,msg+' The crowd heard about it. Your next song starts with the crowd meter at half.');
 return 'Your next song starts with the crowd meter at half.';
}
function lockFor(secs,msg){
 APP.lockUntil=performance.now()+secs*1000;
 $('#lockMsg').textContent=msg;$('#lockLayer').classList.add('on');
 if(APP.accom.readAloud)speak(msg);
 const tick=()=>{const left=Math.ceil((APP.lockUntil-performance.now())/1000);
  if(left<=0){$('#lockLayer').classList.remove('on');return;}$('#lockSecs').textContent=left;setTimeout(tick,200);};
 tick();
}
function bumpRecords(){const el=$('#recordCount');el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump');}
function updateStats(){
 $('#recordCount').textContent=ST.records;
 $('#sessionStats').textContent=APP.total?APP.correct+' of '+APP.total+' correct this session':'Every correct answer earns '+(LEVELS[APP.diff].pay>1?LEVELS[APP.diff].pay+' gold records':'1 gold record')+'. No timer.';
}

// ===== results logging (small batches; the last 2 wait in case they get flagged as guesses) =====
const LOG={queue:[],sending:false,again:false};
function logEvent(e){e.set=APP.set.name;e.tab=APP.tab;e.difficulty=LEVELS[APP.diff].name;e.accom=accomText();LOG.queue.push(e);}
function toRow(e){return {time:e.time,email:playerEmail(),set:e.set,tab:e.tab,difficulty:e.difficulty,question:e.question,teks:e.teks,result:e.result,accom:e.accom,guess:!!e.guess,event:e.event};}
function flushLog(force){
 if(LOG.sending){if(force)LOG.again=true;return;}
 const n=LOG.queue.length-(force?0:2);if(n<=0||(!force&&n<3))return;
 const batch=LOG.queue.splice(0,n);LOG.sending=true;
 call('logAnswers',batch.map(toRow)).then(()=>{LOG.sending=false;if(LOG.again){LOG.again=false;flushLog(true);}})
  .catch(()=>{LOG.sending=false;LOG.queue=batch.concat(LOG.queue);});
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){flushLog(true);if(saveTimer){clearTimeout(saveTimer);doSave();}}});
window.addEventListener('pagehide',()=>flushLog(true));

// ===== studio =====
function allOwned(){return GENRES.every(g=>ST.packs.has(g.k))&&ALL_IDS.every(id=>ST.riffs.has(id));}
function renderSlots(){
 const box=$('#slots');box.innerHTML='';
 ST.songs.forEach((s,i)=>{const b=document.createElement('button');b.className='slot'+(i===ST.slot?' on':'');b.innerHTML='<b>Song '+(i+1)+'</b>'+esc(s.name);
  b.onclick=()=>{stopAll();ST.slot=i;queueSave();renderStudio();ensureSel(song().sel);};box.appendChild(b);});
 const r=document.createElement('button');r.className='linkBtn';r.textContent='Rename song';r.onclick=openNameModal;box.appendChild(r);
}
function renderStudio(){
 const G0=GENRE[ST.tab];
 renderSlots();
 const tabs=$('#genreTabs');tabs.innerHTML='';
 for(const g of GENRES){const b=document.createElement('button');b.className='gtab'+(g.k===ST.tab?' on':'')+(ST.packs.has(g.k)?'':' lockedTab');
  b.style.setProperty('--gc',g.color);b.textContent=(ST.packs.has(g.k)?'':'🔒 ')+g.name;
  b.onclick=()=>{ST.tab=g.k;renderStudio();};tabs.appendChild(b);}
 const banner=$('#packBanner');banner.style.setProperty('--gc',G0.color);
 $('#packName').textContent=G0.name+' pack';$('#packDesc').textContent=G0.desc;
 const ub=$('#unlockPack');
 if(ST.packs.has(G0.k)){ub.style.display='none';}
 else{ub.style.display='';ub.textContent='Unlock pack · '+G0.cost+' 💿';ub.disabled=ST.records<G0.cost;
  ub.onclick=()=>{if(ST.records>=G0.cost){ST.records-=G0.cost;ST.packs.add(G0.k);ensurePack(G0.k);queueSave();renderStudio();updateStats();}};}
 $('#packSpeak').onclick=()=>speak(G0.name+' pack. '+G0.desc+(ST.packs.has(G0.k)?'':' Unlock it for '+G0.cost+' records.'));
 const wrap=$('#tracks');wrap.innerHTML='';
 const sel=song().sel;
 for(const role of ROLES){
  const row=document.createElement('div');row.className='track';
  const cur=sel[role.k]?RIFF[sel[role.k]]:null;
  row.innerHTML='<div><div class="roleName">'+role.label+'</div><div class="roleSub">'+(cur?esc(cur.name)+' ('+esc(GENRE[cur.genre].name)+')':'None')+'</div><div class="roleWhen">'+role.when+'</div></div><div class="riffs"></div>';
  const rf=row.querySelector('.riffs');
  for(const r of RIFFS.filter(x=>x.genre===G0.k&&x.role===role.k)){
   const owned=ST.riffs.has(r.id),selected=sel[role.k]===r.id,packOpen=ST.packs.has(r.genre);
   const card=document.createElement('div');card.className='riff'+(selected?' selected':'')+(owned?'':' locked');card.style.setProperty('--gc',G0.color);
   let action;
   if(selected)action='<span class="tag on">In your song</span>';
   else if(owned)action='<button class="use">Use</button>';
   else if(!packOpen)action='<span class="tag">Unlock the pack first</span>';
   else action='<button class="buy"'+(ST.records<r.cost?' disabled':'')+'>Unlock · '+r.cost+' 💿</button>';
   const inst=r.inst?INST_NAME[r.inst]:'Drum kit';
   card.innerHTML='<div class="riffTop"><button class="audition" title="Hear it">▶</button><div><div class="riffName">'+esc(r.name)+'</div><div class="riffGenre">'+esc(inst)+(r.swing?' · swing':'')+'</div></div>'+
    (APP.accom.readAloud?'<button class="speak" title="Read aloud">🔊</button>':'')+'</div><div class="riffAct">'+action+'</div>';
   card.querySelector('.audition').onclick=e=>audition(r.id,e.currentTarget);
   const sp=card.querySelector('.speak');if(sp)sp.onclick=()=>speak(r.name+'. '+inst+'. '+(owned?'You own this riff.':'Costs '+r.cost+' record'+(r.cost>1?'s':'')+'.'));
   const use=card.querySelector('.use');if(use)use.onclick=()=>{sel[role.k]=r.id;loadInst(r.inst);queueSave();renderStudio();};
   const buy=card.querySelector('.buy');if(buy)buy.onclick=()=>{if(ST.records>=r.cost){ST.records-=r.cost;ST.riffs.add(r.id);sel[role.k]=r.id;loadInst(r.inst);queueSave();renderStudio();updateStats();}};
   rf.appendChild(card);
  }
  if(sel[role.k]&&role.k==='lead'){const rm=document.createElement('button');rm.className='removeLead';rm.textContent='Remove lead';rm.onclick=()=>{sel.lead=null;queueSave();renderStudio();};rf.appendChild(rm);}
  wrap.appendChild(row);
 }
 $('#platinum').classList.toggle('on',allOwned());
 $('#shareBtn').style.display=APP.radioOpen?'':'none';$('#radioBtn').style.display=APP.radioOpen?'':'none';
 $('#recordCount').textContent=ST.records;
}

// ===== song names =====
function openNameModal(){
 const w=song().name.split(' ');
 fillSelect($('#nameA'),NAME_A,NAME_A.includes(w[0])?w[0]:pick(NAME_A));
 fillSelect($('#nameB'),NAME_B,NAME_B.includes(w[1])?w[1]:pick(NAME_B));
 fillSelect($('#nameC'),NAME_C,NAME_C.includes(w[2])?w[2]:pick(NAME_C));
 $('#nameSpeak').style.display=APP.accom.readAloud?'':'none';
 modal('nameModal',true);
}

// ===== radio =====
function shareCurrent(){
 const b=$('#shareBtn');b.disabled=true;b.textContent='Sending...';
 call('shareSong',{name:song().name,sel:song().sel,stage:ST.stage},playerEmail()).then(res=>{
  b.disabled=false;b.textContent=res&&res.ok?'📻 Sent!':'📻 Send to Radio';
  if(!res||!res.ok)alertNote((res&&res.error)||'Could not send the song.');
  setTimeout(()=>b.textContent='📻 Send to Radio',2500);
 }).catch(()=>{b.disabled=false;b.textContent='📻 Send to Radio';alertNote('Could not send the song. Try again.');});
}
function alertNote(t){$('#audioNote').textContent=t;setTimeout(showAudioNote,5000);}
function openRadio(){
 stopAll();modal('radioModal',true);const list=$('#radioList');list.innerHTML='<div class="small">Tuning in...</div>';
 call('getRadio',playerEmail()).then(res=>{
  if(!res||!res.open){list.innerHTML='<div class="small">The Radio is off right now.</div>';APP.radioOpen=false;renderStudio();return;}
  if(!res.songs.length){list.innerHTML='<div class="small">No songs yet. Be the first: press Send to Radio.</div>';return;}
  list.innerHTML='';
  res.songs.forEach(s=>{const d=document.createElement('div');d.className='radioItem';
   d.innerHTML='<div><b>'+esc(s.name)+'</b><span>by '+esc(s.stage)+(s.mine?' (you)':'')+'</span></div><button>▶ Play it</button>';
   d.querySelector('button').onclick=()=>{modal('radioModal',false);openStage({name:s.name,sel:s.sel,owner:s.mine?'Own song':s.stage,fromRadio:true});};
   list.appendChild(d);});
 }).catch(()=>{list.innerHTML='<div class="small">Could not reach the Radio. Try again.</div>';});
}

// ===== stage setup =====
const PREF_KEY=()=>'st68_prefs_'+(playerEmail()||'x');
function loadPrefs(){let p=null;try{p=JSON.parse(localStorage.getItem(PREF_KEY())||'null');}catch(e){}
 return Object.assign({level:'easy',speed:APP.accom.extended?'slow':'normal',lanes:'4',nofail:false,quiet:false,offset:0},p||{});}
function savePrefs(p){try{localStorage.setItem(PREF_KEY(),JSON.stringify(p));}catch(e){}}
let PREFS=null,STAGE_SONG=null;
function segSet(id,val){$$('#'+id+' button').forEach(b=>b.classList.toggle('on',b.dataset.v===val));}
function openStage(songInfo){
 stopAll();PREFS=loadPrefs();STAGE_SONG=songInfo;
 $('#stageTitle').textContent=songInfo.fromRadio?'Play "'+songInfo.name+'"':'Take the stage';
 const parts=$('#partPick');parts.innerHTML='';let first=null;
 for(const role of ['rhythm','bass','lead']){const id=songInfo.sel[role];const b=document.createElement('button');b.className='pick';
  const n=id?buildChart(songInfo.sel,role,'normal',4).length:0;
  b.innerHTML='<b>'+cap(role)+'</b><span>'+(id&&RIFF[id]?esc(RIFF[id].name)+' · '+INST_NAME[RIFF[id].inst]+' · '+n+' notes':'No riff chosen')+'</span>';
  b.disabled=!id||!RIFF[id];b.onclick=()=>{$$('#partPick .pick').forEach(x=>x.classList.remove('on'));b.classList.add('on');$('#stageModal').dataset.part=role;};
  if(!b.disabled&&!first)first=b;parts.appendChild(b);}
 if(first)first.click();
 segSet('optLevel',PREFS.level);segSet('optSpeed',PREFS.speed);segSet('optLanes',PREFS.lanes);
 $('#optNofail').checked=PREFS.nofail;$('#optQuiet').checked=PREFS.quiet;
 $('#timingNote').textContent=PREFS.offset?'Your offset: '+Math.round(PREFS.offset*1000)+' ms':'Not set';
 modal('stageModal',true);
}
['optLevel','optSpeed','optLanes'].forEach(id=>document.addEventListener('click',e=>{const b=e.target.closest('#'+id+' button');if(!b)return;
 PREFS[{optLevel:'level',optSpeed:'speed',optLanes:'lanes'}[id]]=b.dataset.v;segSet(id,b.dataset.v);}));

// ===== timing check =====
const TM={running:false,beats:[],taps:[]};
function startTiming(){
 if(TM.running)return;
 TM.running=true;TM.taps=[];master.gain.value=0.8;const B=makeBus();const t0=ctx.currentTime+1.2;TM.beats=[];
 for(let i=0;i<10;i++){const t=t0+i*STEP*2;TM.beats.push(t);tone('square',i<2?660:880,0,t,0.06,0.4,B);}
 TM.beats=TM.beats.slice(2);
 $('#timingMsg').textContent='Listen for 2 clicks, then tap on the next 8.';$('#tapBig').textContent='Tap!';
 const lat=ctx.outputLatency||ctx.baseLatency||0;
 const flash=()=>{if(!TM.running)return;const now=ctx.currentTime-lat;const on=TM.beats.concat([t0,t0+STEP*2]).some(b=>Math.abs(now-b)<0.07);$('#tapBig').classList.toggle('beat',on);requestAnimationFrame(flash);};flash();
 setTimeout(finishTiming,(t0+10*STEP*2-ctx.currentTime+0.6)*1000);
}
function tapTiming(){if(!TM.running){startTiming();return;}const lat=ctx.outputLatency||ctx.baseLatency||0;TM.taps.push(ctx.currentTime-lat);}
function finishTiming(){
 TM.running=false;$('#tapBig').classList.remove('beat');$('#tapBig').textContent='Again';
 const offs=TM.taps.map(t=>{let best=null;for(const b of TM.beats)if(best===null||Math.abs(t-b)<Math.abs(best))best=t-b;return best;}).filter(o=>o!==null&&Math.abs(o)<0.3).sort((a,b)=>a-b);
 if(offs.length<4){$('#timingMsg').textContent='Not enough taps. Press Again and tap on each click.';return;}
 const med=offs[Math.floor(offs.length/2)];PREFS.offset=Math.round(med*1000)/1000;savePrefs(PREFS);
 $('#timingMsg').textContent='Done! Your offset is '+Math.round(med*1000)+' ms. The highway will adjust.';
 $('#timingNote').textContent='Your offset: '+Math.round(med*1000)+' ms';
}

// ===== play mode =====
const LANE_KEYS4=['d','f','j','k'],LANE_COLORS4=['#3ddc84','#ff5a5a','#ffd23f','#3fa7ff'];
let G=null;
function buildChart(sel,role,level,lanes){
 const id=sel[role];if(!id||!RIFF[id])return[];const r=RIFF[id];
 const pitches=[...new Set(r.notes.map(([s,l,n])=>midi(Array.isArray(n)?n[0]:n)))].sort((a,b)=>a-b);
 const laneOf=m=>Math.min(3,Math.floor(pitches.indexOf(m)*4/pitches.length));
 const evens=r.notes.filter(x=>x[0]%2===0);const easyNotes=evens.length>=3?evens:r.notes.filter((_,i)=>i%2===0);
 const src=level==='easy'?easyNotes:r.notes;
 const chart=[];
 for(const cy of songLayout()){if(!cy.roles.includes(role))continue;
  for(const [s,len,n] of src){
   const m=midi(Array.isArray(n)?n[0]:n);
   chart.push({t:cy.cycle*CYCLE+stepT(s,r.swing),lane:pitches.length<=4?pitches.indexOf(m):laneOf(m),n,len:len*STEP,inst:r.inst,done:false});}}
 if(pitches.length<4&&pitches.length>1){const map=pitches.length===2?[0,3]:[0,1,3];chart.forEach(c=>c.lane=map[c.lane]);}
 if(lanes===2)chart.forEach(c=>c.lane=c.lane<2?0:1);
 chart.sort((a,b)=>a.t-b.t);
 return chart;
}
function laneSetup(n){
 const keys=n===2?['f','j']:LANE_KEYS4,colors=n===2?[LANE_COLORS4[1],LANE_COLORS4[2]]:LANE_COLORS4;
 const box=$('#laneBtns');box.innerHTML='';
 keys.forEach((k,i)=>{const b=document.createElement('button');b.className='lanebtn';b.style.borderColor=colors[i];b.textContent=k.toUpperCase();
  b.addEventListener('pointerdown',e=>{e.preventDefault();hit(i);});box.appendChild(b);});
 return {keys,colors};
}
async function startGame(){
 const role=$('#stageModal').dataset.part;if(!role)return;
 PREFS.nofail=$('#optNofail').checked;PREFS.quiet=$('#optQuiet').checked;savePrefs(PREFS);
 modal('stageModal',false);stopAll();
 const sel=STAGE_SONG.sel;
 $('#goStage').disabled=true;await ensureSel(sel);$('#goStage').disabled=false;
 if(ctx.state==='suspended')await ctx.resume();
 show('game');
 master.gain.value=PREFS.quiet?0.22:0.8;
 const lanes=Number(PREFS.lanes)||4;const L=laneSetup(lanes);
 const B=makeBus();const t0=ctx.currentTime+CYCLE/2+0.4;
 for(let i=0;i<4;i++)drum('h',t0-(4-i)*STEP*2,0.9,B),drum('b',t0-(4-i)*STEP*2,0.6,B);
 const end=scheduleSong(sel,t0,B,role);
 const crowdHalf=ST.data.crowdHalf&&!STAGE_SONG.fromRadio;
 if(crowdHalf){ST.data.crowdHalf=false;queueSave();}
 G={role,level:PREFS.level,lanes,keys:L.keys,colors:L.colors,B,t0,end,sel,chart:buildChart(sel,role,PREFS.level,lanes),
  score:0,streak:0,best:0,perfect:0,good:0,miss:0,extra:0,flash:new Array(lanes).fill(0),msgs:[],
  look:SPEEDS[PREFS.speed]||1.7,offset:PREFS.offset||0,nofail:PREFS.nofail,quiet:PREFS.quiet,
  crowd:crowdHalf?0.35:0.7,crowdHalf,failed:false,running:true,light:false,frames:[],lastFrame:0};
 current={B,timer:null};
 $('#gPart').textContent=cap(role)+' · '+(PREFS.level==='easy'?'Easy':'Normal');
 if(crowdHalf)G.msgs.push({txt:'The crowd heard you were guessing...',lane:(lanes-1)/2,life:3,col:'#ff9a7a'});
 requestAnimationFrame(loop);
}
function lat(){return (ctx.outputLatency||ctx.baseLatency||0);}
function songTime(){return ctx.currentTime-lat()-G.t0-G.offset;}
function mult(){return Math.min(4,1+Math.floor(G.streak/8));}
function crowdAdd(d){G.crowd=Math.max(0,Math.min(1,G.crowd+d));if(G.crowd<=0&&!G.nofail&&!G.failed){G.failed=true;finish();}}
function quietFlash(col){if(!G.quiet)return;const f=$('#quietFlash');f.style.boxShadow='inset 0 0 0 14px '+col;setTimeout(()=>f.style.boxShadow='inset 0 0 0 0 transparent',90);}
function hit(lane){
 if(!G||!G.running)return;G.flash[lane]=1;
 const t=songTime();let best=null;
 for(const n of G.chart){if(n.done||n.lane!==lane)continue;const dt=t-n.t;if(Math.abs(dt)<=0.15&&(!best||Math.abs(dt)<Math.abs(t-best.t)))best=n;if(n.t>t+0.2)break;}
 if(best){best.done=true;const dt=Math.abs(t-best.t);const perfect=dt<=0.07;
  if(perfect)G.perfect++;else G.good++;G.streak++;G.best=Math.max(G.best,G.streak);
  G.score+=(perfect?100:60)*mult();crowdAdd(0.02);
  playChordOrNote(best.inst,best.n,ctx.currentTime,best.len,VOL[G.role]*1.1,G.B);
  G.msgs.push({txt:perfect?'PERFECT':'GOOD',lane,life:1,col:perfect?'#ffd23f':'#9ef'});quietFlash(G.colors[lane]);}
 else{G.extra++;G.streak=0;crowdAdd(-0.02);G.msgs.push({txt:'EXTRA',lane,life:1,col:'#ff7a7a'});}
}
function loop(now){
 if(!G||!G.running)return;
 if(G.lastFrame){G.frames.push(now-G.lastFrame);if(G.frames.length>40)G.frames.shift();
  if(!G.light&&G.frames.length===40&&G.frames.reduce((a,b)=>a+b,0)/40>45)G.light=true;}
 G.lastFrame=now;
 const t=songTime();
 for(const n of G.chart){if(!n.done&&t-n.t>0.15){n.done=true;n.missed=true;G.miss++;G.streak=0;crowdAdd(-0.06);if(!G.running)return;}}
 draw(t);
 if(ctx.currentTime>G.end+1.2){finish();return;}
 requestAnimationFrame(loop);
}
function draw(t){
 const cv=$('#hw'),r=cv.getBoundingClientRect(),dpr=G.light?1:(window.devicePixelRatio||1);
 if(cv.width!==Math.round(r.width*dpr)||cv.height!==Math.round(r.height*dpr)){cv.width=Math.round(r.width*dpr);cv.height=Math.round(r.height*dpr);}
 const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);const W=r.width,H=r.height;c.clearRect(0,0,W,H);
 const N=G.lanes,strikeY=H-70,topW=W*(N===2?0.18:0.32),botW=W*(N===2?0.5:0.86),cx=W/2;
 const proj=(lane,y)=>{const f=y/strikeY;const w=topW+(botW-topW)*f;return cx-w/2+w*(lane+0.5)/N;};
 const widthAt=y=>{const f=y/strikeY;return (topW+(botW-topW)*f)/N;};
 c.fillStyle='rgba(20,8,40,.85)';c.beginPath();c.moveTo(cx-topW/2,0);c.lineTo(cx+topW/2,0);c.lineTo(cx+botW/2+30,H);c.lineTo(cx-botW/2-30,H);c.closePath();c.fill();
 c.strokeStyle='rgba(255,255,255,.12)';c.lineWidth=1;
 for(let i=0;i<=N;i++){c.beginPath();c.moveTo(cx-topW/2+topW*i/N,0);c.lineTo(cx-botW/2+botW*i/N,strikeY);c.stroke();}
 if(!G.light){const bl=STEP*2;for(let k=Math.floor(t/bl);k<(t+G.look)/bl;k++){const dt=k*bl-t;if(dt<0)continue;const y=strikeY*(1-dt/G.look);const w=widthAt(y)*N;c.strokeStyle=k%4===0?'rgba(255,255,255,.22)':'rgba(255,255,255,.07)';c.beginPath();c.moveTo(cx-w/2,y);c.lineTo(cx+w/2,y);c.stroke();}}
 c.strokeStyle='rgba(255,255,255,.6)';c.lineWidth=3;c.beginPath();c.moveTo(cx-botW/2,strikeY);c.lineTo(cx+botW/2,strikeY);c.stroke();
 for(let l=0;l<N;l++){const x=proj(l,strikeY),rad=Math.min(widthAt(strikeY)*0.24,40);c.lineWidth=4;c.strokeStyle=G.colors[l];c.fillStyle=G.flash[l]>0?G.colors[l]:'rgba(0,0,0,.5)';
  if(G.quiet&&G.flash[l]>0){c.globalAlpha=G.flash[l]*0.35;c.fillRect(x-widthAt(strikeY)/2,0,widthAt(strikeY),strikeY);c.globalAlpha=1;}
  c.beginPath();c.arc(x,strikeY,rad,0,7);c.fill();c.stroke();G.flash[l]=Math.max(0,G.flash[l]-0.12);
  c.fillStyle='#fff';c.font='bold 15px Inter,sans-serif';c.textAlign='center';c.fillText(G.keys[l].toUpperCase(),x,strikeY+rad+22);}
 for(const n of G.chart){const dt=n.t-t;if(dt>G.look)break;if(n.done&&!n.missed)continue;if(dt<-0.3)continue;
  const y=strikeY*(1-dt/G.look);const x=proj(n.lane,y),rad=Math.min(widthAt(y)*0.22,36);
  c.globalAlpha=n.missed?0.25:1;c.fillStyle=G.colors[n.lane];c.beginPath();c.ellipse(x,y,rad,rad*0.62,0,0,7);c.fill();
  if(!G.light){c.fillStyle='rgba(255,255,255,.75)';c.beginPath();c.ellipse(x,y-rad*0.12,rad*0.45,rad*0.22,0,0,7);c.fill();}c.globalAlpha=1;}
 G.msgs=G.msgs.filter(m=>m.life>0);for(const m of G.msgs){c.globalAlpha=Math.min(1,m.life);c.fillStyle=m.col;c.font='bold 18px Righteous,sans-serif';c.textAlign='center';c.fillText(m.txt,proj(m.lane,strikeY),strikeY-60-(1-Math.min(1,m.life))*40);m.life-=0.03;}c.globalAlpha=1;
 if(t<0){c.fillStyle='#fff';c.font='bold 64px Righteous,sans-serif';c.textAlign='center';c.fillText(Math.ceil(-t/(STEP*2)),cx,H*0.4);}
 const judged=G.perfect+G.good+G.miss;
 $('#gScore').textContent=G.score.toLocaleString();$('#gStreak').textContent=G.streak;$('#gMult').textContent='×'+mult();
 $('#gAcc').textContent=judged?Math.round((G.perfect+G.good)/judged*100)+'%':'--';
 $('#gCrowd').style.width=Math.round(G.crowd*100)+'%';
 const prog=Math.max(0,Math.min(1,t/(TOTAL_CYCLES*CYCLE)));$('#gProg').style.width=(prog*100)+'%';
 const lay=songLayout();const cyc=Math.max(0,Math.min(lay.length-1,Math.floor(t/CYCLE)));$('#gSection').textContent=t<0?'Count-in':lay[cyc].name;
}
function finish(){
 if(!G||!G.running)return;
 G.running=false;stopAll();master.gain.value=0.8;
 const total=G.chart.length,hitN=G.perfect+G.good,acc=total?hitN/total*100:0;
 const stars=G.failed?1:acc>=95?5:acc>=85?4:acc>=70?3:acc>=50?2:1;
 show('results');
 $('#rTitle').textContent=G.failed?'The crowd walked out!':"Show's over!";
 $('#rSong').textContent='"'+STAGE_SONG.name+'"'+(STAGE_SONG.fromRadio?' by '+STAGE_SONG.owner:'')+' · '+cap(G.role);
 $('#rStars').textContent='★'.repeat(stars)+'☆'.repeat(5-stars);
 $('#rScore').textContent=G.score.toLocaleString();
 $('#rLine').innerHTML='<div><b>'+Math.round(acc)+'%</b><span>notes hit</span></div><div><b>'+G.best+'</b><span>best streak</span></div><div><b>'+G.perfect+'</b><span>perfect</span></div><div><b>'+G.good+'</b><span>good</span></div><div><b>'+G.miss+'</b><span>missed</span></div><div><b>'+G.extra+'</b><span>extra presses</span></div>';
 const assists=[cap(PREFS.speed)+' speed',G.lanes+' lanes'];if(G.nofail)assists.push('No-fail');if(G.quiet)assists.push('Quiet');
 call('logPlay',{email:playerEmail(),song:STAGE_SONG.name,owner:STAGE_SONG.fromRadio?STAGE_SONG.owner:'Own song',part:cap(G.role),
  level:G.level==='easy'?'Easy':'Normal',assists:assists.join(', '),accuracy:Math.round(acc),stars,score:G.score}).catch(()=>{});
 if(APP.accom.readAloud)speak((G.failed?'The crowd walked out. ':'Show is over. ')+stars+' stars. '+Math.round(acc)+' percent of notes hit.');
}
function quitGame(){if(G)G.running=false;stopAll();master&&(master.gain.value=0.8);show('studio');renderStudio();}

// ===== keyboard =====
document.addEventListener('keydown',e=>{
 if(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'))return;
 if($('#timingModal').style.display==='flex'){if(e.key===' '){e.preventDefault();if(!e.repeat)tapTiming();}return;}
 if(G&&G.running){if(e.repeat)return;const l=G.keys.indexOf(e.key.toLowerCase());
  const l2=G.lanes===2?{d:0,k:1}[e.key.toLowerCase()]:undefined;
  if(l>=0){e.preventDefault();hit(l);}else if(l2!==undefined){e.preventDefault();hit(l2);}
  if(e.key==='Escape')quitGame();return;}
 if(!$('#studio').classList.contains('active')||$$('.modal').some(m=>m.style.display==='flex'))return;
 const k=e.key.toLowerCase();
 if(k==='v'&&APP.accom.readAloud&&APP.q){if(APP.answered)speak($('#feedback').textContent);else readQuestion();e.preventDefault();return;}
 if(!APP.answered&&/^[1-5]$/.test(k)){const i=Number(k)-1;if(APP.q&&i<APP.q.choices.length)answer(i);return;}
 if(APP.answered&&k==='enter'){e.preventDefault();nextQuestion();}
});

// ===== boot =====
window.addEventListener('DOMContentLoaded',()=>{
 $('#codeBtn').onclick=redeemCode;
 $('#enterBtn').onclick=enterStudio;
 $('#stageSpeak').onclick=()=>speak('Your stage name is '+$('#stagePre').value+' '+$('#stageWord').value);
 $('#nextQ').onclick=nextQuestion;
 $('#qSpeak').onclick=()=>{if(APP.answered)speak($('#feedback').textContent);else readQuestion();};
 $('#changeSet').onclick=()=>{stopAll();stopSpeech();flushLog(true);showSetPick();};
 $('#previewBtn').onclick=previewSong;
 $('#stageBtn').onclick=()=>openStage({name:song().name,sel:song().sel,owner:'Own song',fromRadio:false});
 $('#shareBtn').onclick=shareCurrent;
 $('#radioBtn').onclick=openRadio;
 $('#radioClose').onclick=()=>modal('radioModal',false);
 $('#nameCancel').onclick=()=>modal('nameModal',false);
 $('#nameOk').onclick=()=>{song().name=$('#nameA').value+' '+$('#nameB').value+' '+$('#nameC').value;modal('nameModal',false);queueSave();renderStudio();};
 $('#nameSpeak').onclick=()=>speak($('#nameA').value+' '+$('#nameB').value+' '+$('#nameC').value);
 $('#cancelStage').onclick=()=>modal('stageModal',false);
 $('#goStage').onclick=startGame;
 $('#timingBtn').onclick=()=>{modal('timingModal',true);$('#timingMsg').textContent='Tap the circle (or press Space) on every click. 8 clicks.';$('#tapBig').textContent='Start';};
 $('#tapBig').addEventListener('pointerdown',e=>{e.preventDefault();tapTiming();});
 $('#timingClose').onclick=()=>{TM.running=false;modal('timingModal',false);};
 $('#quitBtn').onclick=quitGame;
 $('#againBtn').onclick=()=>{show('studio');renderStudio();openStage(STAGE_SONG);};
 $('#backBtn').onclick=()=>{show('studio');renderStudio();if(STAGE_SONG&&STAGE_SONG.fromRadio)openRadio();};
 startup();
});
