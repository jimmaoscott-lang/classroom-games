const {chromium}=require('/opt/npm-tools/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--autoplay-policy=no-user-gesture-required']});
 const p=await b.newPage({viewport:{width:1366,height:768}});
 const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
 await p.goto('http://localhost:8768/game/index.html?audio=http://localhost:8768/audio/&ra=1&rc=1&et=1');
 await p.waitForSelector('#setpick.active');
 console.log('reduced labels',await p.evaluate(()=>$$('#levelGrid span').map(s=>s.textContent).join(' | ')));
 await p.click('#levelGrid [data-d=easy]');await p.click('#enterBtn');await p.waitForSelector('#studio.active',{timeout:20000});
 console.log('easy+reduced choices',await p.evaluate(()=>APP.q.choices.length),'clockStart',await p.evaluate(()=>APP.clockStart));
 console.log('speakers shown',await p.evaluate(()=>$$('.speak').filter(b=>b.offsetParent).length));
 await p.evaluate(()=>{APP.diff='hard';nextQuestion();});
 console.log('hard+reduced choices',await p.evaluate(()=>APP.q.choices.length));
 await p.evaluate(()=>{APP.diff='easy';});
 // same-position guessing: slow wrong answers in same slot -> wait past threshold
 async function wrongAt(pos){return p.evaluate((pos)=>{
   // force a question where position pos is wrong
   for(let k=0;k<50;k++){nextQuestion();if(!APP.q.choices[pos].right)break;}
   APP.clockStart=performance.now()-60000; answer(pos);},pos);}
 for(let r=0;r<3;r++)await wrongAt(0);
 console.log('same-pos flag',await p.evaluate(()=>APP.flags));
 // second flag -> noRecord, third -> crowdHalf
 await p.evaluate(()=>{APP.lockUntil=0;});
 for(let r=0;r<3;r++){await wrongAt(1);await p.evaluate(()=>{APP.lockUntil=0;});}
 console.log('flag2 noRecord',await p.evaluate(()=>ST.data.noRecord));
 const rec0=await p.evaluate(()=>ST.records);
 await p.evaluate(()=>{nextQuestion();answer(APP.q.choices.findIndex(c=>c.right));});
 console.log('records after penalized correct',rec0,'->',await p.evaluate(()=>ST.records),'noRecord',await p.evaluate(()=>ST.data.noRecord));
 for(let r=0;r<3;r++){await wrongAt(0);await p.evaluate(()=>{APP.lockUntil=0;});}
 console.log('flag3 crowdHalf',await p.evaluate(()=>ST.data.crowdHalf),'flags',await p.evaluate(()=>APP.flags));
 // extended -> speed default slow
 await p.evaluate(()=>{$('#lockLayer').classList.remove('on');});
 await p.click('#stageBtn');console.log('default speed',await p.evaluate(()=>PREFS.speed));
 await p.click('#optLanes [data-v="2"]');await p.click('#goStage');await p.waitForSelector('#game.active');
 await p.waitForTimeout(400);
 console.log('lanes',await p.evaluate(()=>G.lanes),'crowd start',await p.evaluate(()=>G.crowd),'lane set',await p.evaluate(()=>[...new Set(G.chart.map(n=>n.lane))].join()),'buttons',await p.evaluate(()=>$$('#laneBtns button').map(b=>b.textContent).join('')));
 await p.screenshot({path:'08-2lane.png'});
 // no hits -> should fail (no-fail off)
 await p.waitForSelector('#results.active',{timeout:70000});
 console.log('fail title',await p.evaluate(()=>$('#rTitle').textContent),'plays',JSON.stringify(await p.evaluate(()=>window.__plays&&window.__plays.slice(-1))));
 // nofail + quiet
 await p.click('#againBtn');await p.evaluate(()=>{$('#optNofail').checked=true;$('#optQuiet').checked=true;});
 await p.click('#goStage');await p.waitForSelector('#game.active');
 console.log('quiet gain',await p.evaluate(()=>master.gain.value),'nofail',await p.evaluate(()=>G.nofail),'crowd',await p.evaluate(()=>G.crowd));
 await p.evaluate(()=>{G.end=ctx.currentTime+12;});await p.waitForTimeout(6000);console.log('still running with crowd',await p.evaluate(()=>G.running+' '+G.crowd.toFixed(2)));
 await p.keyboard.press('Escape');await p.waitForSelector('#studio.active');
 // radio share + list
 await p.click('#shareBtn');await p.waitForTimeout(300);await p.click('#radioBtn');await p.waitForTimeout(300);
 console.log('radio items',await p.evaluate(()=>$$('.radioItem').map(d=>d.innerText.replace(/\n/g,' / ')).join(' || ')));
 await p.screenshot({path:'09-radio.png'});
 await p.click('.radioItem:nth-child(2) button');await p.waitForTimeout(300);console.log('stage title',await p.evaluate(()=>$('#stageTitle').textContent));
 await p.click('#cancelStage');
 // rename song, switch slot, reload persistence
 await p.click('#slots .linkBtn');await p.selectOption('#nameA','Cosmic');await p.click('#nameOk');
 await p.click('#slots .slot:nth-child(2)');await p.waitForTimeout(1600);
 const before=await p.evaluate(()=>JSON.stringify(saveObj()));
 await p.reload();await p.waitForSelector('#setpick.active');
 console.log('stage name kept',await p.evaluate(()=>ST.stage),'slot',await p.evaluate(()=>ST.slot),'song1',await p.evaluate(()=>ST.songs[0].name));
 console.log('save round trip equal',before===await p.evaluate(()=>JSON.stringify(saveObj())));
 // radio off
 await p.goto('http://localhost:8768/game/index.html?audio=http://localhost:8768/audio/&radio=0');await p.waitForSelector('#setpick.active');await p.click('#enterBtn');await p.waitForSelector('#studio.active');
 console.log('radio off buttons visible',await p.evaluate(()=>[$('#shareBtn').offsetParent!==null,$('#radioBtn').offsetParent!==null].join()));
 // synth fallback when audio blocked
 const p2=await b.newPage();await p2.goto('http://localhost:8768/game/index.html?audio=http://localhost:1/nope/');await p2.waitForSelector('#setpick.active');
 await p2.evaluate(()=>localStorage.clear());await p2.reload();await p2.waitForSelector('#setpick.active');
 await p2.click('#enterBtn');await p2.waitForSelector('#studio.active',{timeout:30000});
 console.log('fallback failed insts',await p2.evaluate(()=>Object.keys(FAILED).join()),'note',await p2.evaluate(()=>$('#audioNote').textContent.slice(0,40)));
 await p2.click('#previewBtn');await p2.waitForTimeout(1000);console.log('preview playing',await p2.evaluate(()=>$('#previewBtn').textContent));
 console.log('ERRORS',errs.length?errs.join('\n'):'none');
 await b.close();
})().catch(e=>{console.error('FAIL',e);process.exit(1)});
