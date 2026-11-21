// A small in-memory stand-in for Google Sheets and Apps Script services, enough to run apps-script/Code.gs in Node.
// Used by tests/step8-test.js.
const fs = require('fs'), vm = require('vm');

function makeSheet(name) {
  const sh = { name, data: [], frozen: 0, fmt: {}, validation: {} };
  const width = () => sh.data.reduce((m, r) => Math.max(m, r.length), 0);
  const cell = (r, c) => (sh.data[r] && sh.data[r][c] !== undefined && sh.data[r][c] !== null) ? sh.data[r][c] : '';
  const set = (r, c, v) => { while (sh.data.length <= r) sh.data.push([]); const row = sh.data[r]; while (row.length <= c) row.push(''); row[c] = v; };
  const disp = v => v instanceof Date ? `${v.getMonth() + 1}/${v.getDate()}/${v.getFullYear()} ${v.getHours()}:${String(v.getMinutes()).padStart(2, '0')}:00` : v === true ? 'TRUE' : v === false ? 'FALSE' : String(v);
  function range(r, c, nr, nc) {
    nr = nr || 1; nc = nc || 1;
    const R = {
      getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => cell(r - 1 + i, c - 1 + j))),
      getDisplayValues: () => R.getValues().map(row => row.map(disp)),
      getValue: () => cell(r - 1, c - 1),
      setValue: v => { set(r - 1, c - 1, v); return R; },
      setValues: vals => { if (vals.length !== nr || vals.some(v => v.length !== nc)) throw new Error(`setValues size mismatch on ${name}: ${vals.length}x${vals[0] && vals[0].length} vs ${nr}x${nc}`); vals.forEach((row, i) => row.forEach((v, j) => set(r - 1 + i, c - 1 + j, v))); return R; },
      clearContent: () => { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) if (sh.data[r - 1 + i]) set(r - 1 + i, c - 1 + j, ''); trim(); return R; },
      clear: () => R.clearContent(), clearDataValidations: () => R,
      setFontWeight: () => R, setFontSize: () => R, setBackground: () => R, setHorizontalAlignment: () => R,
      setNumberFormat: f => { sh.fmt[r + ',' + c] = f; return R; },
      setDataValidation: v => { sh.validation[r + ',' + c] = v; return R; },
    };
    return R;
  }
  function trim() { while (sh.data.length && sh.data[sh.data.length - 1].every(v => v === '' || v == null)) sh.data.pop(); }
  Object.assign(sh, {
    getName: () => name, setName: n => { sh.name = n; return sh; },
    getRange: (r, c, nr, nc) => range(r, c, nr, nc),
    getDataRange: () => range(1, 1, Math.max(1, sh.data.length), Math.max(1, width())),
    getLastRow: () => { trim(); return sh.data.length; }, getLastColumn: () => width(),
    getMaxRows: () => Math.max(1000, sh.data.length), getMaxColumns: () => Math.max(26, width()),
    setFrozenRows: n => { sh.frozen = n; }, setColumnWidth: () => sh,
    copyTo: ss => { const c = ss.insertSheet(name + ' copy'); c.data = JSON.parse(JSON.stringify(sh.data)); return c; },
    rows: () => { trim(); return sh.data; },
  });
  return sh;
}

function makeGas(codePath) {
  const sheets = {}, toasts = [], store = new Map();
  const ss = {
    getSheetByName: n => sheets[n] || null,
    insertSheet: n => { if (sheets[n]) throw new Error('exists ' + n); return sheets[n] = makeSheet(n); },
    getSpreadsheetTimeZone: () => 'America/Chicago',
    toast: m => toasts.push(m), setActiveSheet: () => { },
  };
  const ctx = {
    __email: '',
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ss, flush: () => { },
      getUi: () => ({ createMenu: () => { const m = { addItem: () => m, addSeparator: () => m, addToUi: () => m }; return m; } }),
      newDataValidation: () => { const b = { requireValueInList: l => { b.list = l; return b; }, setAllowInvalid: () => b, build: () => ({ list: b.list }) }; return b; },
    },
    Session: { getActiveUser: () => ({ getEmail: () => ctx.__email }) },
    LockService: { getScriptLock: () => ({ waitLock() { }, releaseLock() { } }) },
    CacheService: { getScriptCache: () => ({ get: k => store.has(k) ? store.get(k) : null, put: (k, v) => store.set(k, String(v)), getAll: ks => { const o = {}; ks.forEach(k => { if (store.has(k)) o[k] = store.get(k); }); return o; } }) },
    Utilities: { formatDate: (d, tz, f) => { const p = n => String(n).padStart(2, '0'); return f === 'yyyy-MM-dd' ? `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` : `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`; } },
    Logger: { log: () => { } },
    Math, JSON, String, Number, Date, Error, Object, Array, isNaN, parseInt,
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(codePath, 'utf8'), ctx);
  ctx.__sheets = sheets; ctx.__toasts = toasts; ctx.__cache = store;
  // Call a Code.gs function as a given signed-in user (JSON in, JSON out, like google.script.run).
  ctx.__as = (email, fn, args) => { ctx.__email = email || ''; const r = ctx[fn](...JSON.parse(JSON.stringify(args || []))); return r === undefined ? null : JSON.parse(JSON.stringify(r)); };
  return ctx;
}
module.exports = { makeGas };
