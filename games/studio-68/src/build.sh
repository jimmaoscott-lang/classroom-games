#!/bin/bash
# Rebuilds mockup/index.html from src/head.html, the trimmed samples in audio/, and src/game.js.
# Run from games/studio-68:  bash src/build.sh
set -e
cd "$(dirname "$0")/.."
{
  echo "const SAMPLES={"
  for inst in $(ls audio/*.mp3 | xargs -n1 basename | cut -d- -f1 | sort -u); do
    echo "\"$inst\":{"
    for f in audio/$inst-*.mp3; do n=$(basename "$f" .mp3); n=${n#*-}; echo "\"$n\":\"$(base64 -w0 "$f")\","; done
    echo "},"
  done
  echo "};"
} > /tmp/samples.js
{ cat src/head.html; cat /tmp/samples.js; cat src/game.js; echo '</script></body></html>'; } > mockup/index.html
echo "Built mockup/index.html ($(wc -c < mockup/index.html) bytes)"
