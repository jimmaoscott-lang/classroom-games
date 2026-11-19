// Only one screen may be visible at a time
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});const p=await b.newPage({viewport:{width:1366,height:768}});
 await p.goto('http://localhost:8768/game/index.html?audio=http://localhost:8768/audio/');
 const vis=()=>p.evaluate(()=>$$('.screen').filter(s=>getComputedStyle(s).display!=='none').map(s=>s.id).join(','));
 await p.waitForSelector('#setpick.active');console.log('setpick visible screens:',await vis());await p.screenshot({path:'/home/claude/tests/10-setpick.png'});
 await p.evaluate(()=>showSignin(true));console.log('signin visible screens:',await vis());await p.screenshot({path:'/home/claude/tests/11-signin.png'});
 await p.evaluate(()=>showSetPick());await p.click('#enterBtn');await p.waitForSelector('#studio.active');console.log('studio visible screens:',await vis());
 await b.close();})();
