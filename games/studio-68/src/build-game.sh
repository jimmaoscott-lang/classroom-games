#!/bin/bash
# Builds game/index.html (the real game) from src/page.html, src/riffs.js, src/main.js,
# the sample list in audio/, and the sample questions in apps-script/Code.gs.
# Run from games/studio-68:  bash src/build-game.sh
set -e
cd "$(dirname "$0")/.."
mkdir -p game
{
  cat src/page.html
  echo "// STUDIO68_PAGE"
  echo "const SAMPLE_LIST={"
  for inst in $(ls audio/*.mp3 | xargs -n1 basename | cut -d- -f1 | sort -u); do
    notes=$(ls audio/$inst-*.mp3 | xargs -n1 basename | sed "s/^$inst-//; s/\.mp3$//" | sed "s/.*/'&'/" | paste -sd,)
    echo "$inst:[$notes],"
  done
  echo "};"
  sed -n '/^var SAMPLE_QUESTIONS = \[/,/^\];/p' apps-script/Code.gs
  cat src/riffs.js
  cat src/main.js
  echo '</script></body></html>'
} > game/index.html
echo "Built game/index.html ($(wc -c < game/index.html) bytes)"
