# Huddle Up headless tests
Run from `games/huddle-up` after `bash src/build-game.sh`:
- `node tests/play-test.js [outdir] [games] [missRate]` - bot plays full Quick games (spends points at breaks) on offense and defense, checks reduced choices, saves screenshots of each play type and result.
- `node tests/plan-test.js [outdir]` - forces every result type through every play and defense for both teams, checks positions stay valid.
- `node tests/step4-test.js [outdir]` - injuries, trainer icon, guess-flag lock, break screen spending, rating cap and floor, computer break points.
- `node tests/balance-test.js` - Monte Carlo of the result math; checks right answers beat higher ratings.
Playwright path in the scripts: `/opt/npm-tools/node_modules/playwright`; Chrome: `/usr/bin/google-chrome`.
