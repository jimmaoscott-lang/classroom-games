# Huddle Up headless tests
Run from `games/huddle-up` after `bash src/build-game.sh`:
- `node tests/play-test.js [outdir]` - plays all 12 prototype plays with a bot (right answers, a first miss, a delay of game), checks reduced choices, saves screenshots.
Playwright path in the scripts: `/opt/npm-tools/node_modules/playwright`; Chrome: `/usr/bin/google-chrome`.
