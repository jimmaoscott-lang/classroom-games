#!/bin/bash
# Builds game/index.html (the page students get) from src/page.html, src/test-questions.js and src/main.js.
# Run from games/huddle-up:  bash src/build-game.sh
set -e
cd "$(dirname "$0")/.."
mkdir -p game
{ cat src/page.html; cat src/test-questions.js; cat src/main.js; echo '</script></body></html>'; } > game/index.html
echo "Built game/index.html ($(wc -c < game/index.html) bytes)"
