// Simulate Apps Script: page HTML written into a document after it already loaded
const {chromium}=require('/opt/npm-tools/node_modules/playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});const p=await b.newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8768/audio/');
 const html=fs.readFileSync('/home/claude/classroom-games/games/studio-68/game/index.html','utf8');
 await p.evaluate(h=>{document.open();document.write(h);document.close();},html);
 await p.waitForSelector('#setpick.active',{timeout:10000});console.log('started after late load; errors:',errs.length?errs:'none');await b.close();})().catch(e=>{console.log('FAIL',e.message);process.exit(1)});
