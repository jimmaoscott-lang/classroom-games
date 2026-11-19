# Studio '68 headless tests
Serve this folder first: `python3 -m http.server 8768` (run from `games/studio-68`).
- `node tests/code-gs-test.js` - Code.gs against an in-memory Sheet (`gasmock.js`)
- `node tests/reports-test.js` - Class Overview, Student Report, report date range (fake names only)
- `node tests/play-test.js` - questions, records, guess flag, unlocks, a full song with a bot
- `node tests/assists-test.js` - accommodations, guess levels, 2 lanes, fail/no-fail, quiet, Radio, saves, synth fallback
- `node tests/end-to-end-test.js` - the page wired to Code.gs (sign-up, saves, Radio, backup code)
Playwright path in the scripts: `/opt/npm-tools/node_modules/playwright`; Chrome: `/usr/bin/google-chrome`.
