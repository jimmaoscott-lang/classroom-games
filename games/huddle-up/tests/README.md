# Huddle Up headless tests
Run from `games/huddle-up` after `bash src/build-game.sh`:
- `node tests/play-test.js [outdir] [games]` - bot plays full Quick games on offense and defense, checks reduced choices, saves screenshots of each play type and result.
- `node tests/plan-test.js [outdir]` - forces every result type through every play and defense for both teams, checks positions stay valid.
- `node tests/balance-test.js` - Monte Carlo of the result math; checks right answers beat higher ratings.
Playwright path in the scripts: `/opt/npm-tools/node_modules/playwright`; Chrome: `/usr/bin/google-chrome`.
