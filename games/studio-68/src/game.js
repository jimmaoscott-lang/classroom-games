// ===== constants =====
const BPM=100, STEP=60/BPM/2, CYCLE_STEPS=16, CYCLE=STEP*CYCLE_STEPS;
const NOTE_IDX={C:0,Cs:1,D:2,Ds:3,E:4,F:5,Fs:6,G:7,Gs:8,A:9,As:10,B:11};
function midi(n){const m=n.match(/^([A-G]s?)(\d)$/);return NOTE_IDX[m[1]]+12*(+m[2]+1);}
const Em_ac=['E2','B2','E3','G3','B3','E4'],G_ac=['G2','B2','D3','G3','B3','G4'],D_ac=['D3','A3','D4','Fs4'];
const Em_p=['E2','B2','E3'],G_p=['G2','D3','G3'],D_p=['D3','A3','D4'];
const Em_o=['E3','G3','B3','E4'],G_o=['G3','B3','D4','G4'],D_o=['D3','Fs3','A3','D4'];
const Em_k=['E3','G3','B3','E4'],G_k=['G3','B3','D4'],D_k=['Fs3','A3','D4'];
const Em9=['E3','G3','D4','Fs4'],Gmaj7=['G2','B3','D4','Fs4'],D6=['D3','Fs3','B3','E4'];
const Em_hi=['E3','G3','B3','E4'],G_hi=['G3','B3','D4','G4'],D_hi=['D3','A3','D4','Fs4'];
function seq(list,len){return list.map((n,i)=>[i*len,len,n]);}
const ALL8=[0,1,2,3,4,5,6,7];
const GENRES=[
 {k:'folk',name:"Folk '65",color:'#ff8c2a',cost:0,desc:'Acoustic guitar, upright bass, harmonica, brush drums.'},
 {k:'rock',name:"Rock '68",color:'#ff4f9a',cost:2,desc:'Electric guitar, electric bass, organ, rock drums.'},
 {k:'motown',name:"Motown '66",color:'#c77dff',cost:2,desc:'Piano stabs, bouncing bass, tambourine, horns, sax.'},
 {k:'jazz',name:'Jazz',color:'#2ad4c4',cost:2,desc:'Swing ride cymbal, walking bass, piano comping, sax, trumpet.'},
 {k:'country',name:'Country',color:'#e0b05a',cost:2,desc:'Train beat, boom-chuck bass, picked guitar, fiddle.'},
 {k:'hiphop',name:'Hip Hop',color:'#7cff6b',cost:2,desc:'Boom bap and trap drums, 808 sub bass, lo-fi keys, flute.'},
 {k:'pop',name:'Pop',color:'#4fc3ff',cost:2,desc:'Dance drums, synth bass, synth stabs, synth and piano hooks.'},
];
const GENRE=Object.fromEntries(GENRES.map(g=>[g.k,g]));
const RIFFS=[
 // Folk
 {id:'f_dr1',name:'Brush Shuffle',genre:'folk',role:'drums',cost:0,drums:{k:[0,4],b:[2,6],t:[1,3,5,7]}},
 {id:'f_dr2',name:'Tambourine March',genre:'folk',role:'drums',cost:1,drums:{k:[0,2,4,6],b:[2,6],t:ALL8}},
 {id:'f_bs1',name:'Walking Root',genre:'folk',role:'bass',inst:'cbs',cost:0,notes:[[0,2,'E2'],[2,2,'G2'],[4,2,'B2'],[6,2,'G2'],[8,2,'G2'],[10,2,'B2'],[12,2,'D2'],[14,2,'Fs2']]},
 {id:'f_bs2',name:'Two-Feel',genre:'folk',role:'bass',inst:'cbs',cost:1,notes:[[0,4,'E2'],[4,4,'B1'],[8,4,'G2'],[12,4,'D2']]},
 {id:'f_rh1',name:'Folk Strum',genre:'folk',role:'rhythm',inst:'gac',cost:0,notes:[[0,2,Em_ac],[2,1,Em_ac],[3,2,Em_ac],[5,1,Em_ac],[6,2,Em_ac],[8,2,G_ac],[10,1,G_ac],[11,1,G_ac],[12,2,D_ac],[14,1,D_ac],[15,1,D_ac]]},
 {id:'f_rh2',name:'Fingerpick',genre:'folk',role:'rhythm',inst:'gac',cost:1,notes:seq(['E2','B2','E3','G3','B3','G3','E3','B2','G2','D3','G3','B3','D3','A3','D4','A3'],1)},
 {id:'f_ld1',name:'Freedom Line',genre:'folk',role:'lead',inst:'hrm',cost:1,notes:[[0,2,'B4'],[2,1,'A4'],[3,1,'G4'],[4,4,'E4'],[8,2,'D5'],[10,2,'B4'],[12,2,'A4'],[14,2,'Fs4']]},
 {id:'f_ld2',name:'Answer Song',genre:'folk',role:'lead',inst:'hrm',cost:2,notes:[[0,1,'E4'],[1,1,'G4'],[2,2,'A4'],[4,1,'B4'],[5,1,'A4'],[6,2,'G4'],[8,1,'G4'],[9,1,'A4'],[10,2,'B4'],[12,2,'A4'],[14,1,'Fs4'],[15,1,'D4']]},
 // Rock
 {id:'r_dr1',name:'Backbeat',genre:'rock',role:'drums',cost:1,drums:{k:[0,3,4],s:[2,6],h:ALL8}},
 {id:'r_dr2',name:'Garage Stomp',genre:'rock',role:'drums',cost:2,drums:{k:[0,1,4,5],s:[2,6,7],h:ALL8,c:[0]}},
 {id:'r_bs1',name:'Root Eighths',genre:'rock',role:'bass',inst:'bel',cost:1,notes:seq(['E2','E2','E2','E2','E2','E2','E2','E2','G2','G2','G2','G2','D2','D2','D2','D2'],1)},
 {id:'r_bs2',name:'Blues Run',genre:'rock',role:'bass',inst:'bel',cost:2,notes:seq(['E2','E2','G2','A2','As2','B2','D3','B2','G2','G2','B2','D3','D2','D2','Fs2','A2'],1)},
 {id:'r_rh1',name:'Power Chords',genre:'rock',role:'rhythm',inst:'gel',cost:1,notes:[[0,2,Em_p],[3,1,Em_p],[4,2,Em_p],[6,1,Em_p],[7,1,Em_p],[8,2,G_p],[10,1,G_p],[11,1,G_p],[12,2,D_p],[14,1,D_p],[15,1,D_p]]},
 {id:'r_rh2',name:'Psych Organ',genre:'rock',role:'rhythm',inst:'org',cost:2,notes:[[0,3,Em_o],[3,1,Em_o],[4,4,Em_o],[8,3,G_o],[11,1,G_o],[12,3,D_o],[15,1,D_o]]},
 {id:'r_ld1',name:'Fuzz Riff',genre:'rock',role:'lead',inst:'gel',cost:2,notes:[[0,1,'E4'],[1,1,'G4'],[2,1,'A4'],[3,1,'As4'],[4,2,'B4'],[6,1,'A4'],[7,1,'G4'],[8,2,'B4'],[10,1,'G4'],[11,1,'A4'],[12,2,'A4'],[14,1,'Fs4'],[15,1,'E4']]},
 {id:'r_ld2',name:'Organ Hook',genre:'rock',role:'lead',inst:'org',cost:2,notes:[[0,2,'E5'],[2,2,'D5'],[4,2,'B4'],[6,2,'G4'],[8,2,'B4'],[10,1,'A4'],[11,1,'G4'],[12,4,'Fs4']]},
 // Motown
 {id:'m_dr1',name:'Motor City Beat',genre:'motown',role:'drums',cost:1,drums:{k:[0,3,4],s:[0,2,4,6],t:[2,6],h:ALL8}},
 {id:'m_bs1',name:'Bouncing Bass',genre:'motown',role:'bass',inst:'bel',cost:1,notes:[[0,1,'E2'],[1,1,'E2'],[3,1,'G2'],[4,1,'B2'],[5,1,'A2'],[6,1,'G2'],[7,1,'E2'],[8,1,'G2'],[9,1,'G2'],[11,1,'B2'],[12,1,'D2'],[13,1,'D2'],[14,1,'Fs2'],[15,1,'A2']]},
 {id:'m_rh1',name:'Piano Stabs',genre:'motown',role:'rhythm',inst:'pno',cost:1,notes:[[1,1,Em_k],[3,1,Em_k],[5,1,Em_k],[7,1,Em_k],[9,1,G_k],[11,1,G_k],[13,1,D_k],[15,1,D_k]]},
 {id:'m_ld1',name:'Horn Hits',genre:'motown',role:'lead',inst:'tpt',cost:1,notes:[[2,1,'B4'],[3,1,'B4'],[4,2,'E5'],[6,2,'D5'],[10,1,'D5'],[11,1,'D5'],[12,2,'Fs5'],[14,2,'E5']]},
 {id:'m_ld2',name:'Soul Sax',genre:'motown',role:'lead',inst:'sax',cost:2,notes:[[0,2,'E4'],[2,1,'G4'],[3,1,'A4'],[4,3,'B4'],[7,1,'A4'],[8,2,'G4'],[10,2,'B4'],[12,3,'A4'],[15,1,'Fs4']]},
 // Jazz (swing)
 {id:'j_dr1',name:'Swing Ride',genre:'jazz',role:'drums',cost:1,swing:true,drums:{R:[0,2,3,4,6,7],k:[0,4],h:[2,6]}},
 {id:'j_bs1',name:'Walking Bass',genre:'jazz',role:'bass',inst:'cbs',cost:1,swing:true,notes:[[0,2,'E2'],[2,2,'Fs2'],[4,2,'G2'],[6,2,'A2'],[8,2,'G2'],[10,2,'B2'],[12,2,'D2'],[14,2,'Ds2']]},
 {id:'j_rh1',name:'Piano Comping',genre:'jazz',role:'rhythm',inst:'pno',cost:1,swing:true,notes:[[0,1,Em9],[3,2,Em9],[6,1,Em9],[8,1,Gmaj7],[11,1,Gmaj7],[12,1,D6],[15,1,D6]]},
 {id:'j_ld1',name:'Muted Trumpet',genre:'jazz',role:'lead',inst:'tpt',cost:1,swing:true,notes:[[0,3,'G4'],[3,1,'A4'],[4,4,'B4'],[8,2,'D5'],[10,2,'B4'],[12,4,'A4']]},
 {id:'j_ld2',name:'Bebop Sax',genre:'jazz',role:'lead',inst:'sax',cost:2,swing:true,notes:[[0,1,'B4'],[1,1,'A4'],[2,1,'G4'],[3,1,'Fs4'],[4,1,'E4'],[5,1,'G4'],[6,2,'B4'],[8,1,'D5'],[9,1,'B4'],[10,1,'G4'],[11,1,'A4'],[12,1,'Fs4'],[13,1,'A4'],[14,2,'D5']]},
 // Country
 {id:'c_dr1',name:'Train Beat',genre:'country',role:'drums',cost:1,drums:{k:[0,4],r:[2,6],b:ALL8}},
 {id:'c_bs1',name:'Boom-Chuck Bass',genre:'country',role:'bass',inst:'cbs',cost:1,notes:[[0,2,'E2'],[4,2,'B1'],[6,1,'E2'],[7,1,'Fs2'],[8,2,'G2'],[10,2,'D2'],[12,2,'D2'],[14,1,'A2'],[15,1,'Ds2']]},
 {id:'c_rh1',name:"Pickin' Guitar",genre:'country',role:'rhythm',inst:'gac',cost:1,notes:[[0,1,'E2'],[2,1,Em_hi],[3,1,Em_hi],[4,1,'B2'],[6,1,Em_hi],[8,1,'G2'],[10,1,G_hi],[11,1,G_hi],[12,1,'A2'],[14,1,D_hi],[15,1,D_hi]]},
 {id:'c_ld1',name:'Slow Fiddle',genre:'country',role:'lead',inst:'vln',cost:1,notes:[[0,4,'B4'],[4,2,'A4'],[6,2,'G4'],[8,4,'B4'],[12,4,'A4']]},
 {id:'c_ld2',name:'Fiddle Tune',genre:'country',role:'lead',inst:'vln',cost:2,notes:seq(['E5','D5','B4','A4','G4','A4','B4','D5','D5','B4','G4','B4','A4','Fs4','E4','Fs4'],1)},
 // Hip hop
 {id:'h_dr1',name:'Boom Bap',genre:'hiphop',role:'drums',cost:1,drums:{k:[0,3,5],s:[2,6],h:ALL8}},
 {id:'h_dr2',name:'Trap Hats',genre:'hiphop',role:'drums',cost:2,drums:{K:[0,3],p:[4],x:ALL8}},
 {id:'h_bs1',name:'808 Sub',genre:'hiphop',role:'bass',inst:'sub',cost:1,notes:[[0,3,'E2'],[3,1,'E2'],[6,2,'B1'],[8,3,'G2'],[11,1,'G2'],[12,4,'D2']]},
 {id:'h_rh1',name:'Lo-fi Keys',genre:'hiphop',role:'rhythm',inst:'pno',cost:1,notes:[[0,3,Em9],[3,1,Em9],[5,3,Em9],[8,3,Gmaj7],[11,1,Gmaj7],[12,4,D6]]},
 {id:'h_ld1',name:'Flute Loop',genre:'hiphop',role:'lead',inst:'flt',cost:1,notes:[[0,1,'E5'],[1,1,'D5'],[2,2,'B4'],[4,1,'A4'],[5,1,'B4'],[6,2,'G4'],[8,2,'B4'],[10,1,'A4'],[11,1,'G4'],[12,2,'Fs4'],[14,2,'A4']]},
 // Pop
 {id:'p_dr1',name:'Dance Pop',genre:'pop',role:'drums',cost:1,drums:{k:[0,2,4,6],p:[2,6],o:[1,3,5,7]}},
 {id:'p_bs1',name:'Synth Pulse',genre:'pop',role:'bass',inst:'syn',cost:1,notes:seq(['E2','E3','E2','E3','E2','E3','E2','E3','G2','G3','G2','G3','D2','D3','D2','D3'],1)},
 {id:'p_rh1',name:'Synth Stabs',genre:'pop',role:'rhythm',inst:'pad',cost:1,notes:[[0,2,Em_o],[2,1,Em_o],[3,2,Em_o],[6,2,Em_o],[8,2,G_o],[10,1,G_o],[11,1,G_o],[12,2,D_o],[14,2,D_o]]},
 {id:'p_ld1',name:'Hook Synth',genre:'pop',role:'lead',inst:'ldr',cost:1,notes:[[0,1,'B4'],[1,1,'B4'],[2,1,'A4'],[3,1,'B4'],[4,2,'D5'],[6,2,'B4'],[8,1,'G4'],[9,1,'A4'],[10,2,'B4'],[12,2,'A4'],[14,2,'Fs4']]},
 {id:'p_ld2',name:'Piano Hook',genre:'pop',role:'lead',inst:'pno',cost:1,notes:[[0,2,'E5'],[2,2,'B4'],[4,2,'G4'],[6,2,'B4'],[8,2,'D5'],[10,2,'B4'],[12,2,'A4'],[14,2,'Fs4']]},
];
const RIFF=Object.fromEntries(RIFFS.map(r=>[r.id,r]));
const ROLES=[{k:'drums',label:'Drums'},{k:'bass',label:'Bass'},{k:'rhythm',label:'Rhythm'},{k:'lead',label:'Lead'}];
const INST_NAME={cbs:'Upright bass',gac:'Acoustic guitar',hrm:'Harmonica (reed)',bel:'Electric bass',gel:'Electric guitar',org:'Organ',pno:'Piano',sax:'Saxophone',tpt:'Trumpet',vln:'Fiddle',flt:'Flute',sub:'808 bass',syn:'Synth bass',pad:'Synth chords',ldr:'Synth lead',drums:'Drum kit'};
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
function stepT(s,swing){return s*STEP+(swing&&s%2===1?STEP*0.33:0);}

const QUESTIONS=[
 ['What did the Gulf of Tonkin Resolution (1964) give President Johnson?','Broad power to use military force in Vietnam without a declaration of war',['The power to end the draft','A treaty ending the war with North Vietnam','Money to rebuild South Vietnam after the war'],'Congress passed it after reported attacks on U.S. ships. Johnson used it to escalate the war.'],
 ['What did the domino theory predict?','If one Southeast Asian nation fell to communism, its neighbors would follow',['Communism would collapse on its own','The U.S. economy would fall if the war ended','Vietnam would split into many small nations'],'U.S. leaders used this idea to justify defending South Vietnam.'],
 ['Why was the Tet Offensive (1968) a turning point?','It shocked Americans and turned more public opinion against the war',['It was the first U.S. victory in Vietnam','It ended the war in a cease-fire','It was the first battle with U.S. ground troops'],'North Vietnam lost militarily, but the surprise attack made official claims of progress look false.'],
 ['What was the "credibility gap"?','Public doubt that the government was telling the truth about the war',['The gap between rich and poor soldiers','A break in the Ho Chi Minh Trail','The age gap between voters and soldiers'],'Official reports of progress did not match what Americans saw on TV.'],
 ['What was Vietnamization?',"Nixon's plan to withdraw U.S. troops while South Vietnam took over the fighting",['Moving Vietnamese refugees to the U.S.','Teaching U.S. soldiers the Vietnamese language','A plan to unite North and South Vietnam'],'U.S. troop levels dropped steadily after 1969 under this policy.'],
 ['What did the 26th Amendment (1971) do?','Lowered the voting age to 18',['Ended the military draft','Limited presidents to two terms','Gave Congress control of war spending'],'Many argued that if 18-year-olds could be drafted, they should be able to vote.'],
 ['What happened at Kent State University in 1970?','National Guard troops fired on student protesters, killing four',['Students burned draft cards at a concert','The first draft lottery was held','Nixon announced the end of the war'],'The students were protesting the expansion of the war into Cambodia.'],
 ['How did the 1969 draft lottery decide who was called first?','By birth date, drawn at random',['By last name, in alphabetical order','By grades in school','By state population'],'Each birthday got a number. Low numbers were drafted first.'],
 ['What did the War Powers Resolution (1973) require?','The president must notify Congress within 48 hours of sending troops into combat',['Every war must be approved by voters','The draft must end in peacetime','Only Congress can command the military'],'It limits troops to 60 days without approval from Congress.'],
 ['What happened at the fall of Saigon in 1975?','North Vietnam captured the South Vietnamese capital, ending the war',['U.S. troops captured Hanoi','South Vietnam signed a peace treaty with the U.S.','The Tet Offensive began'],'Vietnam was unified under communist rule.'],
 ['What did the Pentagon Papers reveal?','The government had misled the public about the war for years',['Plans to invade China','Secret peace talks that ended the war','The names of antiwar protest leaders'],'Daniel Ellsberg leaked them, and The New York Times published them in 1971.'],
 ['Who were the Viet Cong?','Communist guerrilla fighters in South Vietnam',['South Vietnamese army officers','U.S. Special Forces units','French colonial soldiers'],'They used hit-and-run tactics and blended in with villagers.'],
 ['What was the Ho Chi Minh Trail?','A supply route through Laos and Cambodia into South Vietnam',['A protest march in Washington, D.C.','A U.S. Navy shipping lane','The border line between North and South Vietnam'],'North Vietnam moved troops and supplies along it despite U.S. bombing.'],
 ['Why is Vietnam called the "living room war"?','Nightly TV news brought images of combat into American homes',['Soldiers fought mostly inside buildings','Most Americans watched it live in theaters','It was planned from the White House living room'],'TV coverage helped shape public opinion about the war.'],
 ['Who were the "silent majority"?','Americans Nixon said quietly supported his policies and did not protest',['Soldiers who refused to talk to reporters','Members of Congress who skipped war votes','Protesters who used silent sit-ins'],'Nixon used the term in a 1969 speech.'],
 ['In the Vietnam debate, what did "doves" want?','To end U.S. involvement in the war',['To escalate the war and win','To bring back the draft','To invade North Vietnam'],'"Hawks" supported stronger military action.'],
];

// ===== state =====
const state={records:0,owned:new Set(RIFFS.filter(r=>r.cost===0).map(r=>r.id)),packs:new Set(['folk']),tab:'folk',
 sel:{drums:'f_dr1',bass:'f_bs1',rhythm:'f_rh1',lead:null},qOrder:[],qPos:0,answered:false,correct:0,total:0};

// ===== audio =====
let ctx,master,SAMP={},noiseBuf,loaded=false;
function b64ToBuf(b){const s=atob(b),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a.buffer;}
async function initAudio(){
 ctx=new (window.AudioContext||window.webkitAudioContext)();
 master=ctx.createGain();master.gain.value=0.8;
 const comp=ctx.createDynamicsCompressor();master.connect(comp);comp.connect(ctx.destination);
 const jobs=[];
 for(const inst in SAMPLES){SAMP[inst]=[];for(const n in SAMPLES[inst]){
   jobs.push(ctx.decodeAudioData(b64ToBuf(SAMPLES[inst][n])).then(buf=>SAMP[inst].push({m:midi(n),buf})));}}
 await Promise.all(jobs);
 for(const k in SAMP)SAMP[k].sort((a,b)=>a.m-b.m);
 noiseBuf=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
 loaded=true;
}
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
function playOne(inst,m,t,dur,vel,B){if(SAMP[inst])playSample(inst,m,t,dur,vel,B);else playSynth(inst,m,t,dur,vel,B);}
function playChordOrNote(inst,n,t,dur,vel,B){
 if(Array.isArray(n)){const v=vel/Math.sqrt(n.length)*1.2;n.forEach((x,i)=>playOne(inst,midi(x),t+(inst==='pad'||inst==='pno'?0:i*0.012),dur,v,B));}
 else playOne(inst,midi(n),t,dur,vel,B);
}
function noise(t,dur,type,freq,vel,B,q){const s=ctx.createBufferSource();s.buffer=noiseBuf;const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=freq;if(q)f.Q.value=q;
 const g=ctx.createGain();g.gain.setValueAtTime(vel,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);s.connect(f);f.connect(g);g.connect(B.bus);s.start(t);s.stop(t+dur+0.02);}
function drum(kind,t,vel,B){
 if(kind==='k'){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(130,t);o.frequency.exponentialRampToValueAtTime(42,t+0.18);
  g.gain.setValueAtTime(vel*1.1,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.35);o.connect(g);g.connect(B.bus);o.start(t);o.stop(t+0.4);}
 else if(kind==='s'){noise(t,0.18,'bandpass',1800,vel*0.9,B,0.7);const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=190;g.gain.setValueAtTime(vel*0.5,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.1);o.connect(g);g.connect(B.bus);o.start(t);o.stop(t+0.12);}
 else if(kind==='b'){noise(t,0.22,'bandpass',2500,vel*0.35,B,0.5);}
 else if(kind==='h'){noise(t,0.05,'highpass',7500,vel*0.25,B);}
 else if(kind==='t'){noise(t,0.12,'highpass',6500,vel*0.3,B);noise(t+0.03,0.08,'highpass',8000,vel*0.15,B);}
 else if(kind==='c'){noise(t,1.2,'highpass',5000,vel*0.35,B);}
 else if(kind==='K'){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(110,t);o.frequency.exponentialRampToValueAtTime(48,t+0.12);
  g.gain.setValueAtTime(vel*1.2,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.7);o.connect(g);g.connect(B.bus);o.start(t);o.stop(t+0.75);}
 else if(kind==='p'){for(const d of [0,0.012,0.024])noise(t+d,0.12,'bandpass',1400,vel*0.6,B,1.2);}
 else if(kind==='r'){noise(t,0.04,'bandpass',3000,vel*0.6,B,3);const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=420;g.gain.setValueAtTime(vel*0.3,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.05);o.connect(g);g.connect(B.bus);o.start(t);o.stop(t+0.06);}
 else if(kind==='o'){noise(t,0.25,'highpass',7000,vel*0.25,B);}
 else if(kind==='x'){noise(t,0.04,'highpass',8000,vel*0.2,B);noise(t+STEP/2,0.04,'highpass',8000,vel*0.14,B);}
 else if(kind==='R'){noise(t,0.45,'bandpass',6500,vel*0.3,B,1.5);const o=ctx.createOscillator(),g=ctx.createGain();o.type='square';o.frequency.value=3200;g.gain.setValueAtTime(vel*0.03,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.4);o.connect(g);g.connect(B.bus);o.start(t);o.stop(t+0.45);}
}
function scheduleRiff(riff,cycleStart,B,vol){
 if(riff.drums){for(const kind in riff.drums)for(const s of riff.drums[kind])for(const bar of [0,8])drum(kind,cycleStart+stepT(bar+s,riff.swing),vol,B);return;}
 for(const [s,len,n] of riff.notes)playChordOrNote(riff.inst,n,cycleStart+stepT(s,riff.swing),len*STEP,vol,B);
}
function songLayout(){const out=[];let c=0;for(const sec of SECTIONS){for(let i=0;i<sec.cycles;i++){out.push({cycle:c,roles:sec.roles,name:sec.name});c++;}}return out;}
function scheduleSong(t0,B,skipRole){
 for(const cy of songLayout()){const cs=t0+cy.cycle*CYCLE;
  for(const role of cy.roles){if(role===skipRole)continue;const id=state.sel[role];if(!id)continue;scheduleRiff(RIFF[id],cs,B,VOL[role]);}}
 // ending hit
 const end=t0+TOTAL_CYCLES*CYCLE;
 if(state.sel.drums){drum('k',end,0.9,B);drum('c',end,1,B);}
 if(state.sel.bass&&skipRole!=='bass')playChordOrNote(RIFF[state.sel.bass].inst,'E2',end,1.6,0.9,B);
 if(state.sel.rhythm&&skipRole!=='rhythm'){const r=RIFF[state.sel.rhythm];const fc=r.notes.find(x=>Array.isArray(x[2]));playChordOrNote(r.inst,fc?fc[2]:'E3',end,1.8,0.5,B);}
 return end;
}
let current=null; // {B, timer}
function stopAll(){if(current){try{current.B.bus.gain.setTargetAtTime(0,ctx.currentTime,0.03);const b=current.B.bus;setTimeout(()=>b.disconnect(),300);}catch(e){}clearTimeout(current.timer);current=null;}
 document.querySelectorAll('.audition.playing').forEach(b=>{b.classList.remove('playing');b.textContent='▶';});
 const pb=document.getElementById('previewBtn');if(pb){pb.classList.remove('playing');pb.textContent='▶ Preview full song';}}
function audition(id,btn){
 if(btn.classList.contains('playing')){stopAll();return;}
 stopAll();const B=makeBus();const t=ctx.currentTime+0.1;scheduleRiff(RIFF[id],t,B,VOL[RIFF[id].role]);scheduleRiff(RIFF[id],t+CYCLE,B,VOL[RIFF[id].role]);
 btn.classList.add('playing');btn.textContent='■';current={B,timer:setTimeout(stopAll,CYCLE*2*1000+400)};
}
function previewSong(){
 const pb=document.getElementById('previewBtn');
 if(pb.classList.contains('playing')){stopAll();return;}
 stopAll();const B=makeBus();const t0=ctx.currentTime+0.15;const end=scheduleSong(t0,B,null);
 pb.classList.add('playing');pb.textContent='■ Stop preview';
 current={B,timer:setTimeout(stopAll,(end-ctx.currentTime+2)*1000)};
}

// ===== UI: questions =====
const $=s=>document.querySelector(s);
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function nextQuestion(){
 if(state.qPos>=state.qOrder.length){state.qOrder=shuffle(QUESTIONS.map((_,i)=>i));state.qPos=0;}
 const q=QUESTIONS[state.qOrder[state.qPos++]];state.answered=false;
 const choices=shuffle([q[1],...q[2]]);
 $('#qText').textContent=q[0];$('#qNum').textContent='Question '+(state.total+1);
 const box=$('#choices');box.innerHTML='';
 choices.forEach((c,i)=>{const b=document.createElement('button');b.className='choice';b.innerHTML='<span class="letter">'+'ABCD'[i]+'</span><span>'+c+'</span>';
  b.onclick=()=>answer(b,c===q[1],q);box.appendChild(b);});
 $('#feedback').className='feedback';$('#feedback').innerHTML='';$('#nextQ').style.display='none';
}
function answer(btn,ok,q){
 if(state.answered)return;state.answered=true;state.total++;
 document.querySelectorAll('.choice').forEach(b=>{b.disabled=true;if(b.textContent.slice(1)===q[1])b.classList.add('right');});
 if(ok){state.correct++;state.records++;btn.classList.add('right');$('#feedback').className='feedback good';$('#feedback').innerHTML='<b>Correct! +1 gold record.</b> '+q[3];bumpRecords();}
 else{btn.classList.add('wrong');$('#feedback').className='feedback bad';$('#feedback').innerHTML='<b>Not quite.</b> '+q[3];}
 $('#nextQ').style.display='inline-block';renderStudio();
}
function bumpRecords(){const el=$('#recordCount');el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump');}

// ===== UI: studio =====
function renderStudio(){
 $('#recordCount').textContent=state.records;
 $('#sessionStats').textContent=state.total?`${state.correct} of ${state.total} correct`:'Answer questions to earn gold records';
 const tabs=$('#genreTabs');tabs.innerHTML='';
 for(const g of GENRES){const b=document.createElement('button');b.className='gtab'+(state.tab===g.k?' on':'')+(state.packs.has(g.k)?'':' lockedTab');b.style.setProperty('--gc',g.color);
  b.innerHTML=(state.packs.has(g.k)?'':'🔒 ')+g.name;b.onclick=()=>{state.tab=g.k;renderStudio();};tabs.appendChild(b);}
 const G0=GENRE[state.tab],rb=$('#packBanner');
 if(state.packs.has(G0.k)){rb.style.display='none';}else{rb.style.display='flex';rb.style.setProperty('--gc',G0.color);
  $('#packName').textContent=G0.name+' pack';$('#packDesc').textContent=G0.desc;const b=$('#unlockPack');b.textContent='Unlock · '+G0.cost+' 💿';b.disabled=state.records<G0.cost;
  b.onclick=()=>{if(state.records>=G0.cost){state.records-=G0.cost;state.packs.add(G0.k);renderStudio();}};}
 const wrap=$('#tracks');wrap.innerHTML='';
 for(const role of ROLES){
  const row=document.createElement('div');row.className='track';
  const sel=state.sel[role.k];
  row.innerHTML=`<div class="trackHead"><div class="roleName">${role.label}</div><div class="roleSub">${sel?RIFF[sel].name+'<br><span style="color:'+GENRE[RIFF[sel].genre].color+'">'+GENRE[RIFF[sel].genre].name+'</span> · '+INST_NAME[RIFF[sel].inst||'drums']:'Empty'}</div><div class="roleWhen">${role.k==='lead'?'Plays in chorus + outro':role.k==='bass'?'Joins at verse 1':'Plays the whole song'}</div></div><div class="riffs"></div>`;
  const rf=row.querySelector('.riffs');
  for(const r of RIFFS.filter(x=>x.role===role.k&&x.genre===state.tab)){
   const owned=state.owned.has(r.id),locked=!state.packs.has(r.genre),isSel=sel===r.id;
   const card=document.createElement('div');card.style.setProperty('--gc',GENRE[r.genre].color);card.className='riff '+(isSel?' selected':'')+(locked?' locked':'')+(!owned&&!locked?' forsale':'');
   let action;
   if(locked)action=`<span class="tag">🔒 ${GENRE[r.genre].name} pack</span>`;
   else if(!owned)action=`<button class="buy" ${state.records<r.cost?'disabled':''}>Unlock · ${r.cost} 💿</button>`;
   else action=isSel?`<span class="tag on">In your song</span>`:`<button class="use">Use</button>`;
   card.innerHTML=`<div class="riffTop"><button class="audition" title="Listen">▶</button><div><div class="riffName">${r.name}</div><div class="riffGenre">${INST_NAME[r.inst||'drums']}${r.swing?' · swing':''}</div></div></div><div class="riffAct">${action}</div>`;
   card.querySelector('.audition').onclick=e=>{e.stopPropagation();audition(r.id,e.currentTarget);};
   const buy=card.querySelector('.buy');if(buy)buy.onclick=()=>{if(state.records>=r.cost){state.records-=r.cost;state.owned.add(r.id);state.sel[role.k]=r.id;renderStudio();}};
   const use=card.querySelector('.use');if(use)use.onclick=()=>{state.sel[role.k]=r.id;renderStudio();};
   rf.appendChild(card);
  }
  if(sel&&role.k==='lead'){const rm=document.createElement('button');rm.className='removeLead';rm.textContent='Remove lead';rm.onclick=()=>{state.sel.lead=null;renderStudio();};rf.appendChild(rm);}
  wrap.appendChild(row);
 }
}

// ===== game =====
const LANE_KEYS=['d','f','j','k'],LANE_COLORS=['#3ddc84','#ff5a5a','#ffd23f','#3fa7ff'];
let G=null;
function openStageModal(){
 stopAll();const m=$('#stageModal');m.style.display='flex';
 const parts=$('#partPick');parts.innerHTML='';
 let first=null;
 for(const role of ['rhythm','bass','lead']){const id=state.sel[role];const b=document.createElement('button');b.className='pick';
  const n=id?buildChart(role,'normal').length:0;
  b.innerHTML=`<b>${role[0].toUpperCase()+role.slice(1)}</b><span>${id?INST_NAME[RIFF[id].inst]+' · '+n+' notes':'No riff chosen'}</span>`;
  b.disabled=!id;b.onclick=()=>{document.querySelectorAll('#partPick .pick').forEach(x=>x.classList.remove('on'));b.classList.add('on');m.dataset.part=role;};
  if(id&&!first){first=b;}parts.appendChild(b);}
 if(first)first.click();
}
function buildChart(role,diff){
 const id=state.sel[role];if(!id)return[];const r=RIFF[id];
 const pitches=[...new Set(r.notes.map(([s,l,n])=>midi(Array.isArray(n)?n[0]:n)))].sort((a,b)=>a-b);
 const laneOf=m=>Math.min(3,Math.floor(pitches.indexOf(m)*4/pitches.length));
 const evens=r.notes.filter(x=>x[0]%2===0);const easyNotes=evens.length>=3?evens:r.notes.filter((_,i)=>i%2===0);
 const src=diff==='easy'?easyNotes:r.notes;
 const chart=[];
 for(const cy of songLayout()){if(!cy.roles.includes(role))continue;
  for(const [s,len,n] of src){
   const m=midi(Array.isArray(n)?n[0]:n);
   chart.push({t:cy.cycle*CYCLE+stepT(s,r.swing),lane:pitches.length<=4?pitches.indexOf(m)*(pitches.length===1?0:1):laneOf(m),n,len:len*STEP,inst:r.inst,done:false});}}
 // spread lanes when fewer than 4 pitches
 if(pitches.length<4&&pitches.length>1){const map=pitches.length===2?[0,3]:[0,1,3];chart.forEach(c=>c.lane=map[c.lane]);}
 return chart;
}
function startGame(){
 const m=$('#stageModal');const role=m.dataset.part;const diff=document.querySelector('input[name=diff]:checked').value;
 m.style.display='none';stopAll();
 $('#studio').style.display='none';$('#game').style.display='flex';$('#results').style.display='none';
 const B=makeBus();const t0=ctx.currentTime+CYCLE/2+0.4;
 for(let i=0;i<4;i++)drum('h',t0-(4-i)*STEP*2,0.9,B),drum('b',t0-(4-i)*STEP*2,0.6,B);
 const end=scheduleSong(t0,B,role);
 G={role,diff,B,t0,end,chart:buildChart(role,diff),score:0,streak:0,best:0,perfect:0,good:0,miss:0,extra:0,flash:[0,0,0,0],msgs:[],look:diff==='easy'?2.2:1.7,running:true};
 current={B,timer:null};
 $('#gPart').textContent=role[0].toUpperCase()+role.slice(1)+' · '+(diff==='easy'?'Easy':'Normal');
 requestAnimationFrame(loop);
}
function lat(){return (ctx.outputLatency||ctx.baseLatency||0);}
function songTime(){return ctx.currentTime-lat()-G.t0;}
function mult(){return Math.min(4,1+Math.floor(G.streak/8));}
function hit(lane){
 if(!G||!G.running)return;G.flash[lane]=1;
 const t=songTime();let best=null;
 for(const n of G.chart){if(n.done||n.lane!==lane)continue;const dt=t-n.t;if(Math.abs(dt)<=0.15&&(!best||Math.abs(dt)<Math.abs(t-best.t)))best=n;if(n.t>t+0.2)break;}
 if(best){best.done=true;const dt=Math.abs(t-best.t);const perfect=dt<=0.07;
  if(perfect)G.perfect++;else G.good++;G.streak++;G.best=Math.max(G.best,G.streak);
  G.score+=(perfect?100:60)*mult();
  playChordOrNote(best.inst,best.n,ctx.currentTime,best.len,VOL[G.role]*1.1,G.B);
  G.msgs.push({txt:perfect?'PERFECT':'GOOD',lane,life:1,col:perfect?'#ffd23f':'#9ef'});}
 else{G.extra++;G.streak=0;G.msgs.push({txt:'EXTRA',lane,life:1,col:'#ff7a7a'});}
}
function loop(){
 if(!G||!G.running)return;
 const t=songTime();
 for(const n of G.chart){if(!n.done&&t-n.t>0.15){n.done=true;n.missed=true;G.miss++;G.streak=0;}}
 draw(t);
 if(ctx.currentTime>G.end+1.2){finish();return;}
 requestAnimationFrame(loop);
}
function draw(t){
 const cv=$('#hw'),r=cv.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
 if(cv.width!==Math.round(r.width*dpr)||cv.height!==Math.round(r.height*dpr)){cv.width=Math.round(r.width*dpr);cv.height=Math.round(r.height*dpr);}
 const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);const W=r.width,H=r.height;c.clearRect(0,0,W,H);
 const strikeY=H-70,topW=W*0.32,botW=W*0.86,cx=W/2;
 const proj=(lane,y)=>{const f=y/strikeY;const w=topW+(botW-topW)*f;return cx-w/2+w*(lane+0.5)/4;};
 const widthAt=y=>{const f=y/strikeY;return (topW+(botW-topW)*f)/4;};
 // board
 c.fillStyle='rgba(20,8,40,.85)';c.beginPath();c.moveTo(cx-topW/2,0);c.lineTo(cx+topW/2,0);c.lineTo(cx+botW/2+30,H);c.lineTo(cx-botW/2-30,H);c.closePath();c.fill();
 c.strokeStyle='rgba(255,255,255,.12)';c.lineWidth=1;
 for(let i=0;i<=4;i++){c.beginPath();c.moveTo(cx-topW/2+topW*i/4,0);c.lineTo(cx-botW/2+botW*i/4,strikeY);c.lineTo(cx-botW/2-30+(botW+60)*i/4,H);c.stroke();}
 // beat lines
 const bl=STEP*2;for(let k=Math.floor(t/bl);k<(t+G.look)/bl;k++){const dt=k*bl-t;if(dt<0)continue;const y=strikeY*(1-dt/G.look);const w=widthAt(y)*4;c.strokeStyle=k%4===0?'rgba(255,255,255,.22)':'rgba(255,255,255,.07)';c.beginPath();c.moveTo(cx-w/2,y);c.lineTo(cx+w/2,y);c.stroke();}
 // strike line + buttons
 c.strokeStyle='rgba(255,255,255,.6)';c.lineWidth=3;c.beginPath();c.moveTo(cx-botW/2,strikeY);c.lineTo(cx+botW/2,strikeY);c.stroke();
 for(let l=0;l<4;l++){const x=proj(l,strikeY),rad=widthAt(strikeY)*0.24;c.lineWidth=4;c.strokeStyle=LANE_COLORS[l];c.fillStyle=G.flash[l]>0?LANE_COLORS[l]:'rgba(0,0,0,.5)';
  c.beginPath();c.arc(x,strikeY,rad,0,7);c.fill();c.stroke();G.flash[l]=Math.max(0,G.flash[l]-0.12);
  c.fillStyle='#fff';c.font='bold 15px Inter,sans-serif';c.textAlign='center';c.fillText(LANE_KEYS[l].toUpperCase(),x,strikeY+rad+22);}
 // notes
 for(const n of G.chart){const dt=n.t-t;if(dt>G.look||n.done&&!n.missed)continue;if(dt<-0.3)continue;
  const y=strikeY*(1-dt/G.look);const x=proj(n.lane,y),rad=widthAt(y)*0.22;
  c.globalAlpha=n.missed?0.25:1;c.fillStyle=LANE_COLORS[n.lane];c.beginPath();c.ellipse(x,y,rad,rad*0.62,0,0,7);c.fill();
  c.fillStyle='rgba(255,255,255,.75)';c.beginPath();c.ellipse(x,y-rad*0.12,rad*0.45,rad*0.22,0,0,7);c.fill();c.globalAlpha=1;}
 // messages
 G.msgs=G.msgs.filter(m=>m.life>0);for(const m of G.msgs){c.globalAlpha=m.life;c.fillStyle=m.col;c.font='bold 18px Righteous,sans-serif';c.textAlign='center';c.fillText(m.txt,proj(m.lane,strikeY),strikeY-60-(1-m.life)*40);m.life-=0.03;}c.globalAlpha=1;
 // count-in
 if(t<0){c.fillStyle='#fff';c.font='bold 64px Righteous,sans-serif';c.textAlign='center';c.fillText(Math.ceil(-t/(STEP*2)),cx,H*0.4);}
 // HUD
 const judged=G.perfect+G.good+G.miss;
 $('#gScore').textContent=G.score.toLocaleString();$('#gStreak').textContent=G.streak;$('#gMult').textContent='×'+mult();
 $('#gAcc').textContent=judged?Math.round((G.perfect+G.good)/judged*100)+'%':'--';
 const prog=Math.max(0,Math.min(1,t/(TOTAL_CYCLES*CYCLE)));$('#gProg').style.width=(prog*100)+'%';
 const lay=songLayout();const cyc=Math.max(0,Math.min(lay.length-1,Math.floor(t/CYCLE)));$('#gSection').textContent=t<0?'Count-in':lay[cyc].name;
}
function finish(){
 G.running=false;stopAll();
 const total=G.chart.length,hitN=G.perfect+G.good,acc=total?hitN/total*100:0;
 const stars=acc>=95?5:acc>=85?4:acc>=70?3:acc>=50?2:1;
 $('#game').style.display='none';$('#results').style.display='flex';
 $('#rStars').textContent='★'.repeat(stars)+'☆'.repeat(5-stars);
 $('#rScore').textContent=G.score.toLocaleString();
 $('#rLine').innerHTML=`<div><b>${Math.round(acc)}%</b><span>notes hit</span></div><div><b>${G.best}</b><span>best streak</span></div><div><b>${G.perfect}</b><span>perfect</span></div><div><b>${G.good}</b><span>good</span></div><div><b>${G.miss}</b><span>missed</span></div><div><b>${G.extra}</b><span>extra presses</span></div>`;
}
function quitGame(){if(G){G.running=false;}stopAll();$('#game').style.display='none';$('#results').style.display='none';$('#studio').style.display='grid';renderStudio();}
document.addEventListener('keydown',e=>{if(!G||!G.running||e.repeat)return;const l=LANE_KEYS.indexOf(e.key.toLowerCase());if(l>=0){e.preventDefault();hit(l);}if(e.key==='Escape')quitGame();});

// ===== boot =====
window.addEventListener('DOMContentLoaded',()=>{
 $('#startBtn').onclick=async()=>{const b=$('#startBtn');b.disabled=true;b.textContent='Tuning instruments...';
  try{await initAudio();}catch(e){b.textContent='Audio could not start. Click to retry.';b.disabled=false;return;}
  $('#splash').style.display='none';$('#studio').style.display='grid';nextQuestion();renderStudio();};
 $('#nextQ').onclick=nextQuestion;
 $('#previewBtn').onclick=previewSong;
 $('#stageBtn').onclick=openStageModal;
 $('#cancelStage').onclick=()=>$('#stageModal').style.display='none';
 $('#goStage').onclick=startGame;
 $('#quitBtn').onclick=quitGame;
 $('#againBtn').onclick=()=>{$('#results').style.display='none';$('#studio').style.display='grid';openStageModal();};
 $('#backBtn').onclick=quitGame;
 $('#testBtn').onclick=()=>{state.records+=5;bumpRecords();renderStudio();};
 document.querySelectorAll('.lanebtn').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();hit(+b.dataset.l);}));
});
