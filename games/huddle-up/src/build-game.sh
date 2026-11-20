#!/bin/bash
# Builds game/index.html (the page students get) from the files in src/.
# Run from games/huddle-up:  bash src/build-game.sh
set -e
cd "$(dirname "$0")/.."
mkdir -p game
{ cat src/page.html; for f in test-questions core draw plays main; do cat src/$f.js; done; echo '</script></body></html>'; } > game/index.html
echo "Built game/index.html ($(wc -c < game/index.html) bytes)"
