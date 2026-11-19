const {chromium}=require('/opt/npm-tools/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--autoplay-policy=no-user-gesture-required']});
 const p=await b.newPage({viewport:{width:1366,height:768}});
 const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE '+m.text())});
 const url='http://localhost:8768/game/index.html?audio=http://localhost:8768/audio/'+(process.argv[2]||'');
 await p.goto(url);await p.waitForSelector('#setpick.active');
 await p.screenshot({path:'01-setpick.png'});
 await p.click('#levelGrid [data-d=hard]');
 await p.click('#enterBtn');await p.waitForSelector('#studio.active',{timeout:20000});
 console.log('loaded insts',await p.evaluate(()=>Object.keys(SAMP).join(',')),'failed',await p.evaluate(()=>Object.keys(FAILED).join(',')));
 // answer 6 correctly
 for(let i=0;i<6;i++){
  const idx=await p.evaluate(()=>APP.q.choices.findIndex(c=>c.right));
  const n=await p.evaluate(()=>APP.q.choices.length);
  await p.click(`#choices .choice:nth-child(${idx+1})`);await p.click('#nextQ');
  if(i==0)console.log('hard choices',n);
 }
 console.log('records after 6 hard right',await p.evaluate(()=>ST.records));
 await p.screenshot({path:'02-studio.png'});
 // 3 fast wrong -> guess flag
 for(let i=0;i<3;i++){const idx=await p.evaluate(()=>APP.q.choices.findIndex(c=>!c.right));await p.click(`#choices .choice:nth-child(${idx+1})`);if(i<2)await p.click('#nextQ');}
 console.log('lock on',await p.evaluate(()=>$('#lockLayer').classList.contains('on')),'flags',await p.evaluate(()=>APP.flags));
 await p.screenshot({path:'03-lock.png'});
 await p.evaluate(()=>flushLog(true));await p.waitForTimeout(300);
 const log=await p.evaluate(()=>window.__log);
 console.log('log rows',log.length,'guess flags',log.filter(r=>r.guess).length,'sample row',JSON.stringify(log[0]));
 // unlock rock pack + a riff
 await p.evaluate(()=>{APP.lockUntil=0;$('#lockLayer').classList.remove('on');});
 await p.click('#genreTabs .gtab:nth-child(2)');await p.click('#unlockPack');
 const buy=await p.$('#tracks .buy:not([disabled])');await buy.click();
 console.log('after unlock records',await p.evaluate(()=>ST.records),'packs',await p.evaluate(()=>[...ST.packs].join()),'sel',await p.evaluate(()=>JSON.stringify(song().sel)));
 await p.click('#tracks .audition');await p.waitForTimeout(1500);
 console.log('insts now',await p.evaluate(()=>Object.keys(SAMP).join(',')));
 await p.screenshot({path:'04-rock.png'});
 await p.waitForTimeout(1600);console.log('saves',await p.evaluate(()=>window.__saves),'stored records',await p.evaluate(()=>PREVIEW.store('save').records));
 // stage: play with bot
 await p.click('#stageBtn');await p.waitForTimeout(300);await p.screenshot({path:'05-stage.png'});
 await p.click('#optLevel [data-v=normal]');await p.click('#goStage');await p.waitForSelector('#game.active');
 await p.evaluate(()=>{window.__bot=setInterval(()=>{if(!G||!G.running)return;const t=songTime();for(const n of G.chart){if(!n.done&&Math.abs(t-n.t)<0.03){hit(n.lane);}}},8);});
 await p.waitForTimeout(8000);await p.screenshot({path:'06-play.png'});
 await p.waitForSelector('#results.active',{timeout:70000});
 await p.screenshot({path:'07-results.png'});
 console.log('results',await p.evaluate(()=>$('#rStars').textContent+' '+$('#rLine').innerText.replace(/\n/g,' ')),'plays',JSON.stringify(await p.evaluate(()=>window.__plays)));
 console.log('ERRORS',errs.length?errs.join('\n'):'none');
 await b.close();
})().catch(e=>{console.error('FAIL',e);process.exit(1)});
