// Minimal in-memory Google Sheets + Apps Script services for testing Code.gs
const vm=require('vm'),fs=require('fs');
function makeEnv(opts){
 const sheets={};const toasts=[];
 class Range{constructor(sh,r,c,nr,nc){Object.assign(this,{sh,r,c,nr:nr||1,nc:nc||1});}
  _get(){const out=[];for(let i=0;i<this.nr;i++){const row=[];for(let j=0;j<this.nc;j++){const R=this.sh.data[this.r-1+i];row.push(R&&R[this.c-1+j]!==undefined?R[this.c-1+j]:'');}out.push(row);}return out;}
  getValues(){return this._get();}
  getDisplayValues(){return this._get().map(r=>r.map(v=>v instanceof Date?v.toISOString():String(v)));}
  getValue(){return this._get()[0][0];}
  setValues(v){if(v.length!==this.nr||v[0].length!==this.nc)throw new Error('setValues size mismatch '+v.length+'x'+v[0].length+' vs '+this.nr+'x'+this.nc);
   for(let i=0;i<this.nr;i++){const R=this.sh.data[this.r-1+i]||(this.sh.data[this.r-1+i]=[]);for(let j=0;j<this.nc;j++)R[this.c-1+j]=v[i][j];}return this;}
  setValue(v){return this.setValues([[v]]);}
  clearContent(){for(let i=0;i<this.nr;i++){const R=this.sh.data[this.r-1+i];if(R)for(let j=0;j<this.nc;j++)R[this.c-1+j]='';}return this;}
  setFontWeight(){return this;} setNumberFormat(){return this;}
  setFontSize(){return this;} setBackground(){return this;} setHorizontalAlignment(){return this;}
  setDataValidation(v){this.sh.validation=v;return this;} clearDataValidations(){return this;}
  clear(){return this.clearContent();}
  getFormula(){return '';} getFormulaR1C1(){return '';}
 }
 class Sheet{constructor(name){this.name=name;this.data=[];}
  getLastRow(){for(let i=this.data.length-1;i>=0;i--){if(this.data[i]&&this.data[i].some(v=>v!==''&&v!==undefined&&v!==null))return i+1;}return 0;}
  getLastColumn(){let m=0;for(let i=0;i<this.data.length;i++){const r=this.data[i];if(r&&r.length>m)m=r.length;}return m;}
  getRange(r,c,nr,nc){return new Range(this,r,c,nr,nc);}
  getDataRange(){return new Range(this,1,1,Math.max(1,this.getLastRow()),Math.max(1,this.getLastColumn()));}
  getMaxRows(){return Math.max(1000,this.data.length);} getMaxColumns(){return Math.max(26,this.getLastColumn());} setColumnWidth(){}
  setFrozenRows(){} copyTo(){const s=new Sheet('copy');s.data=JSON.parse(JSON.stringify(this.data));return {setName:n=>{s.name=n;sheets[n]=s;}};}
 }
 const ss={getSheetByName:n=>sheets[n]||null,insertSheet:n=>(sheets[n]=new Sheet(n)),toast:m=>toasts.push(m),getSpreadsheetTimeZone:()=>'America/Chicago',setActiveSheet:()=>{}};
 const env={sheets,toasts,email:opts.email||'',
  SpreadsheetApp:{getActiveSpreadsheet:()=>ss,flush(){},newDataValidation:()=>{const b={list:null,requireValueInList(l){b.list=l;return b;},setAllowInvalid(){return b;},build(){return {list:b.list};}};return b;},getUi:()=>({alert:()=>'YES',Button:{YES:'YES'},ButtonSet:{YES_NO:1},createMenu(){return this;},addItem(){return this;},addSeparator(){return this;},addToUi(){}})},
  Session:{getActiveUser:()=>({getEmail:()=>env.email})},
  LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
  Utilities:{formatDate:(d)=>d.toISOString().slice(0,10)},
  UrlFetchApp:{fetch:()=>({getResponseCode:()=>404,getContentText:()=>''})},
  HtmlService:{createHtmlOutputFromFile:()=>({setTitle(){return this;},addMetaTag(){return this;}})},
  Logger:{log(){}}, console};
 vm.createContext(env);
 vm.runInContext(fs.readFileSync(opts.code,'utf8'),env);
 return env;
}
module.exports={makeEnv};
