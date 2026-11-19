// ===== riff library: chord shapes, packs, and all 84 riffs =====
const Em_ac=['E2','B2','E3','G3','B3','E4'],G_ac=['G2','B2','D3','G3','B3','G4'],D_ac=['D3','A3','D4','Fs4'];
const Em_p=['E2','B2','E3'],G_p=['G2','D3','G3'],D_p=['D3','A3','D4'];
const Em_o=['E3','G3','B3','E4'],G_o=['G3','B3','D4','G4'],D_o=['D3','Fs3','A3','D4'];
const Em_k=['E3','G3','B3','E4'],G_k=['G3','B3','D4'],D_k=['Fs3','A3','D4'];
const Em9=['E3','G3','D4','Fs4'],Gmaj7=['G2','B3','D4','Fs4'],D6=['D3','Fs3','B3','E4'];
const Em_hi=['E3','G3','B3','E4'],G_hi=['G3','B3','D4','G4'],D_hi=['D3','A3','D4','Fs4'];
function seq(list,len){return list.map((n,i)=>[i*len,len,n]);}
const ALL8=[0,1,2,3,4,5,6,7];
const GENRES=[
 {k:'folk',name:"Folk '65",color:'#ff8c2a',cost:0,desc:'Acoustic guitar, upright bass, harmonica, brush and stomp drums.'},
 {k:'rock',name:"Rock '68",color:'#ff4f9a',cost:2,desc:'Electric guitar, electric bass, organ, rock drums.'},
 {k:'motown',name:"Motown '66",color:'#c77dff',cost:2,desc:'Piano, organ, bouncing bass, horns, sax, flute, handclaps.'},
 {k:'jazz',name:'Jazz',color:'#2ad4c4',cost:2,desc:'Swing ride, brushes, walking bass, piano, organ, sax, trumpet, flute.'},
 {k:'country',name:'Country',color:'#e0b05a',cost:2,desc:'Train beat, boom-chuck bass, guitar, honky tonk piano, fiddle, harmonica.'},
 {k:'hiphop',name:'Hip Hop',color:'#7cff6b',cost:2,desc:'Boom bap and trap drums, 808 and funk bass, keys, organ, flute, sax.'},
 {k:'pop',name:'Pop',color:'#4fc3ff',cost:2,desc:'Dance and disco drums, synth bass, synths, piano.'},
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

// ===== Build 1: new riffs so every part in every pack has 3 =====
const MORE_RIFFS=[
 {id:'f_dr3',name:'Stomp and Clap',genre:'folk',role:'drums',drums:{k:[0,2,4,6],p:[2,6]}},
 {id:'f_bs3',name:'Pedal Tone',genre:'folk',role:'bass',inst:'cbs',notes:[[0,1,'E2'],[2,1,'E2'],[4,1,'B1'],[6,1,'E2'],[8,1,'G2'],[10,1,'G2'],[12,1,'D2'],[14,1,'A2']]},
 {id:'f_rh3',name:'Travis Pick',genre:'folk',role:'rhythm',inst:'gac',notes:seq(['E2','B3','G3','B3','E2','B3','G3','B3','G2','B3','D4','B3','D3','A3','Fs4','A3'],1)},
 {id:'f_ld3',name:'Protest Song',genre:'folk',role:'lead',inst:'hrm',notes:[[0,2,'E4'],[2,2,'G4'],[4,2,'B4'],[6,2,'A4'],[8,3,'G4'],[11,1,'A4'],[12,4,'Fs4']]},

 {id:'r_dr3',name:'Open Hat Drive',genre:'rock',role:'drums',drums:{k:[0,4,5],s:[2,6],o:[0,2,4,6],h:[1,3,5,7]}},
 {id:'r_bs3',name:'Octave Pump',genre:'rock',role:'bass',inst:'bel',notes:seq(['E2','E3','E2','E3','E2','E3','E2','E3','G2','G3','G2','G3','D2','D3','D2','D3'],1)},
 {id:'r_rh3',name:'Jangle Twelve',genre:'rock',role:'rhythm',inst:'gel',notes:seq(['E3','G3','B3','E4','B3','G3','E3','B3','G3','B3','D4','G4','D3','Fs3','A3','D4'],1)},
 {id:'r_ld3',name:'Guitar Solo',genre:'rock',role:'lead',inst:'gel',notes:seq(['B4','D5','E5','D5','B4','A4','G4','A4','B4','D5','B4','G4','A4','Fs4','D4','E4'],1)},

 {id:'m_dr2',name:'Four on the Floor',genre:'motown',role:'drums',drums:{k:[0,2,4,6],s:[2,6],t:ALL8}},
 {id:'m_dr3',name:'Handclap Soul',genre:'motown',role:'drums',drums:{k:[0,3,4,7],p:[2,6],h:ALL8}},
 {id:'m_bs2',name:'Hitsville Run',genre:'motown',role:'bass',inst:'bel',notes:[[0,1,'E2'],[2,1,'B2'],[3,1,'D3'],[4,1,'E3'],[6,1,'D3'],[7,1,'B2'],[8,1,'G2'],[10,1,'D3'],[11,1,'G2'],[12,1,'D2'],[14,1,'A2'],[15,1,'Cs3']]},
 {id:'m_bs3',name:'Steady Eighths',genre:'motown',role:'bass',inst:'bel',notes:seq(['E2','E2','G2','E2','B2','E2','G2','E2','G2','G2','B2','G2','D2','D2','Fs2','A2'],1)},
 {id:'m_rh2',name:'Organ Pads',genre:'motown',role:'rhythm',inst:'org',notes:[[0,4,Em_o],[4,4,Em_o],[8,4,G_o],[12,4,D_o]]},
 {id:'m_rh3',name:'Backbeat Chops',genre:'motown',role:'rhythm',inst:'gac',notes:[[2,1,Em_hi],[6,1,Em_hi],[10,1,G_hi],[14,1,D_hi]]},
 {id:'m_ld3',name:'Flute Melody',genre:'motown',role:'lead',inst:'flt',notes:[[0,2,'B4'],[2,1,'D5'],[3,1,'E5'],[4,4,'D5'],[8,2,'B4'],[10,2,'D5'],[12,2,'A4'],[14,2,'Fs4']]},

 {id:'j_dr2',name:'Brush Ballad',genre:'jazz',role:'drums',swing:true,drums:{b:[0,2,4,6],k:[0],R:[0,3,6]}},
 {id:'j_dr3',name:'Ride and Rim',genre:'jazz',role:'drums',swing:true,drums:{R:[0,2,3,4,6,7],r:[2,6],k:[0,5]}},
 {id:'j_bs2',name:'Half-Time Walk',genre:'jazz',role:'bass',inst:'cbs',swing:true,notes:[[0,4,'E2'],[4,2,'G2'],[6,2,'B2'],[8,4,'G2'],[12,2,'D2'],[14,2,'A2']]},
 {id:'j_bs3',name:'Chromatic Walk',genre:'jazz',role:'bass',inst:'cbs',swing:true,notes:[[0,2,'E2'],[2,2,'G2'],[4,2,'A2'],[6,2,'As2'],[8,2,'B2'],[10,2,'A2'],[12,2,'D2'],[14,2,'Cs2']]},
 {id:'j_rh2',name:'Organ Swells',genre:'jazz',role:'rhythm',inst:'org',swing:true,notes:[[0,6,Em9],[6,2,Em9],[8,4,Gmaj7],[12,4,D6]]},
 {id:'j_rh3',name:'Charleston Comp',genre:'jazz',role:'rhythm',inst:'pno',swing:true,notes:[[0,2,Em9],[3,1,Em9],[8,2,Gmaj7],[11,1,Gmaj7],[12,2,D6],[15,1,D6]]},
 {id:'j_ld3',name:'Cool Flute',genre:'jazz',role:'lead',inst:'flt',swing:true,notes:[[0,2,'E5'],[2,2,'D5'],[4,3,'B4'],[7,1,'A4'],[8,2,'B4'],[10,2,'G4'],[12,2,'A4'],[14,2,'B4']]},

 {id:'c_dr2',name:'Two-Step',genre:'country',role:'drums',drums:{k:[0,4],s:[2,6],h:[1,3,5,7]}},
 {id:'c_dr3',name:'Honky Tonk Brush',genre:'country',role:'drums',drums:{b:[0,2,4,6],k:[0,4],r:[2,6]}},
 {id:'c_bs2',name:'Walking Country',genre:'country',role:'bass',inst:'bel',notes:[[0,2,'E2'],[2,2,'G2'],[4,2,'B2'],[6,2,'D3'],[8,2,'G2'],[10,2,'B2'],[12,2,'D2'],[14,2,'Fs2']]},
 {id:'c_bs3',name:'Root and Five',genre:'country',role:'bass',inst:'cbs',notes:[[0,2,'E2'],[2,2,'B1'],[4,2,'E2'],[6,2,'B1'],[8,2,'G2'],[10,2,'D2'],[12,2,'D2'],[14,2,'A1']]},
 {id:'c_rh2',name:'Strum Shuffle',genre:'country',role:'rhythm',inst:'gac',notes:[[0,2,Em_ac],[2,2,Em_ac],[4,1,Em_ac],[5,1,Em_ac],[6,2,Em_ac],[8,2,G_ac],[10,2,G_ac],[12,2,D_ac],[14,2,D_ac]]},
 {id:'c_rh3',name:'Honky Tonk Piano',genre:'country',role:'rhythm',inst:'pno',notes:[[0,1,'E2'],[1,1,Em_k],[2,1,'B2'],[3,1,Em_k],[4,1,'E2'],[5,1,Em_k],[6,1,'B2'],[7,1,Em_k],[8,1,'G2'],[9,1,G_k],[10,1,'D3'],[11,1,G_k],[12,1,'D2'],[13,1,D_k],[14,1,'A2'],[15,1,D_k]]},
 {id:'c_ld3',name:'Harmonica Bend',genre:'country',role:'lead',inst:'hrm',notes:[[0,1,'G4'],[1,1,'A4'],[2,2,'B4'],[4,2,'A4'],[6,2,'G4'],[8,2,'B4'],[10,2,'D5'],[12,4,'A4']]},

 {id:'h_dr3',name:'Clap Trap',genre:'hiphop',role:'drums',drums:{K:[0,5],p:[2,6],h:ALL8}},
 {id:'h_bs2',name:'808 Bounce',genre:'hiphop',role:'bass',inst:'sub',notes:[[0,1,'E2'],[2,1,'E2'],[3,2,'G2'],[6,2,'E2'],[8,2,'G2'],[10,1,'B1'],[12,3,'D2'],[15,1,'Fs2']]},
 {id:'h_bs3',name:'Funk Bass',genre:'hiphop',role:'bass',inst:'bel',notes:[[0,1,'E2'],[1,1,'E3'],[3,1,'E2'],[4,1,'G2'],[6,1,'A2'],[8,1,'G2'],[9,1,'G3'],[11,1,'G2'],[12,1,'D2'],[14,1,'Fs2']]},
 {id:'h_rh2',name:'Organ Loop',genre:'hiphop',role:'rhythm',inst:'org',notes:[[0,2,Em_o],[3,2,Em_o],[6,2,Em_o],[8,3,G_o],[12,3,D_o]]},
 {id:'h_rh3',name:'Sample Chop',genre:'hiphop',role:'rhythm',inst:'gac',notes:[[0,1,Em_hi],[1,1,Em_hi],[4,2,Em_hi],[8,1,G_hi],[9,1,G_hi],[12,2,D_hi]]},
 {id:'h_ld2',name:'Sax Sample',genre:'hiphop',role:'lead',inst:'sax',notes:[[0,3,'B4'],[3,1,'A4'],[4,2,'G4'],[6,2,'E4'],[8,3,'D5'],[11,1,'B4'],[12,4,'A4']]},
 {id:'h_ld3',name:'Synth Whistle',genre:'hiphop',role:'lead',inst:'ldr',notes:[[0,2,'E5'],[2,2,'G5'],[4,4,'Fs5'],[8,2,'D5'],[10,2,'E5'],[12,4,'B4']]},

 {id:'p_dr2',name:'Synth Pop',genre:'pop',role:'drums',drums:{k:[0,4],s:[2,6],h:ALL8}},
 {id:'p_dr3',name:'Disco',genre:'pop',role:'drums',drums:{k:[0,2,4,6],p:[2,6],o:[1,3,5,7],h:[0,2,4,6]}},
 {id:'p_bs2',name:'Sub Drop',genre:'pop',role:'bass',inst:'sub',notes:[[0,4,'E2'],[4,4,'E2'],[8,4,'G2'],[12,4,'D2']]},
 {id:'p_bs3',name:'Synth Bounce',genre:'pop',role:'bass',inst:'syn',notes:[[0,1,'E2'],[2,1,'E2'],[3,1,'G2'],[5,1,'E2'],[6,1,'B1'],[8,1,'G2'],[10,1,'G2'],[11,1,'B2'],[12,1,'D2'],[14,1,'A2']]},
 {id:'p_rh2',name:'Piano Ballad',genre:'pop',role:'rhythm',inst:'pno',notes:[[0,2,Em_k],[2,2,Em_k],[4,2,Em_k],[6,2,Em_k],[8,2,G_k],[10,2,G_k],[12,2,D_k],[14,2,D_k]]},
 {id:'p_rh3',name:'Pluck Arps',genre:'pop',role:'rhythm',inst:'pad',notes:seq(['E4','G4','B4','G4','E4','G4','B4','G4','G4','B4','D5','B4','D4','Fs4','A4','Fs4'],1)},
 {id:'p_ld3',name:'Vocal Synth',genre:'pop',role:'lead',inst:'ldr',notes:[[0,3,'G4'],[3,1,'A4'],[4,4,'B4'],[8,2,'D5'],[10,2,'E5'],[12,4,'D5']]},
];
RIFFS.push(...MORE_RIFFS);
// Sort by pack, then part, then the order written above; set prices: 1, 1, 2 in each part (Folk drums, bass, rhythm riff 1 free)
const ROLE_ORDER=['drums','bass','rhythm','lead'];
RIFFS.sort((a,b)=>GENRES.findIndex(g=>g.k===a.genre)-GENRES.findIndex(g=>g.k===b.genre)||ROLE_ORDER.indexOf(a.role)-ROLE_ORDER.indexOf(b.role));
(function(){const n={};for(const r of RIFFS){const key=r.genre+r.role;const i=n[key]=(n[key]||0)+1;r.cost=i===3?2:1;if(r.genre==='folk'&&r.role!=='lead'&&i===1)r.cost=0;}})();
const RIFF=Object.fromEntries(RIFFS.map(r=>[r.id,r]));
