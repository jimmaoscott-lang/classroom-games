const {chromium}=require('/opt/npm-tools/node_modules/playwright');const {makeEnv}=require('./gasmock');
(async()=>{
 const E=makeEnv({code:require('path').join(__dirname,'../apps-script/Code.gs'),email:'teacher@x'});
 E.setupTabs();E.turnRadioOn();
 E.sheets.Settings.data[1][1]='Yes';
 E.sheets.Sets.data[1][1]='Sample: Vietnam Era';
 // point audio to local server
 E.AUDIO_BASE_URLS=['http://localhost:8768/audio/'];
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--autoplay-policy=no-user-gesture-required']});
 async function session(email){
  E.email=email;
  const p=await b.newPage({viewport:{width:1366,height:768}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.exposeFunction('__gas',(fn,args)=>{E.email=email;const r=E[fn](...args);return JSON.parse(JSON.stringify(r===undefined?null:r));});
  await p.addInitScript(()=>{
   const mk=(ok,fail)=>new Proxy({},{get(_,name){
     if(name==='withSuccessHandler')return h=>mk(h,fail);if(name==='withFailureHandler')return h=>mk(ok,h);
     return (...args)=>{window.__gas(name,args).then(r=>ok&&ok(r)).catch(e=>fail&&fail(e));};}});
   window.google={script:{run:mk(null,null)}};
  });
  await p.goto('http://localhost:8768/game/index.html');return {p,errs};
 }
 let {p,errs}=await session('jane.doe@x');
 await p.waitForSelector('#signin.active');console.log('period picker shown',await p.isVisible('#periodCard'));
 await p.click('#periodGrid button:nth-child(2)');await p.waitForSelector('#setpick.active');
 await p.click('#enterBtn');await p.waitForSelector('#studio.active',{timeout:20000});
 for(let i=0;i<5;i++){await p.evaluate(()=>answer(APP.q.choices.findIndex(c=>c.right)));await p.click('#nextQ');}
 await p.click('#genreTabs .gtab:nth-child(3)');await p.click('#unlockPack');
 await p.click('#shareBtn');await p.waitForTimeout(2500);
 await p.evaluate(()=>flushLog(true));await p.waitForTimeout(500);
 console.log('Results rows',E.sheets.Results.getLastRow()-1,'Saves',JSON.stringify(E.sheets.Saves.data[1].slice(0,5)));
 console.log('Radio rows',E.sheets.Radio.getLastRow()-1);
 await p.close();
 ({p,errs}=await session('jane.doe@x'));await p.waitForSelector('#setpick.active');
 console.log('returning student records',await p.evaluate(()=>ST.records),'packs',await p.evaluate(()=>[...ST.packs].join()),'stage',await p.evaluate(()=>ST.stage));
 await p.close();
 // classmate sees radio
 ({p,errs}=await session('sam.lee@x'));await p.waitForSelector('#signin.active');await p.click('#periodGrid button:nth-child(2)');await p.waitForSelector('#setpick.active');
 await p.click('#enterBtn');await p.waitForSelector('#studio.active',{timeout:20000});
 await p.click('#radioBtn');await p.waitForTimeout(800);console.log('classmate radio',await p.evaluate(()=>$$('.radioItem').map(d=>d.innerText.replace(/\n/g,' / ')).join(' || ')));
 await p.click('.radioItem button');await p.click('#goStage');await p.waitForSelector('#game.active');await p.keyboard.press('Escape');
 // backup code path: no google email
 const code=E.sheets.Roster.data[1][7];
 ({p,errs}=await session(''));await p.waitForSelector('#signin.active');console.log('code card shown',await p.isVisible('#codeCard'));
 await p.fill('#codeInput',code);await p.click('#codeBtn');await p.waitForSelector('#setpick.active');
 console.log('code student records',await p.evaluate(()=>ST.records),'email',await p.evaluate(()=>playerEmail()));
 await p.click('#enterBtn');await p.waitForSelector('#studio.active',{timeout:20000});
 await p.evaluate(()=>answer(0));await p.evaluate(()=>flushLog(true));await p.waitForTimeout(500);
 const last=E.sheets.Results.data[E.sheets.Results.getLastRow()-1];console.log('code user logged as',last[1],'period',last[2]);
 console.log('ERRORS',errs.length?errs.join('\n'):'none');
 await b.close();
})().catch(e=>{console.error('FAIL',e);process.exit(1)});
