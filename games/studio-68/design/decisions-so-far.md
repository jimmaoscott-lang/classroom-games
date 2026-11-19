# Studio '68: Decisions So Far (Nov 19, 2026)

Mockup: `games/studio-68/mockup/index.html` (also https://claude.ai/artifact/TcWujrgjPNxA5jRBNFq7pr). Rebuild with `bash src/build.sh` from `games/studio-68`.

## Core loop
- Students answer review questions (untimed) to earn gold records.
- Records unlock genre packs and riffs. Students build a song from 4 parts: drums, bass, rhythm, lead.
- Reward: play the song Guitar Hero style with no questions during play.
- Song layout: Intro, Verse, Chorus, Verse, Chorus, Outro (about 50 seconds). Lead plays in chorus and outro.

## Music
- Riffs are note lists played by recorded instruments (tonejs-instruments by Nicholas Brosowsky, CC BY 3.0, credits line required) plus browser-generated drums and synths.
- All riffs: E minor, 100 BPM, progression Em | G D, so any combination works across genres. Jazz riffs use swing timing.
- No paid loop libraries (their licenses forbid handing loops out inside a game).
- Seven packs: Folk '65 (free starter), Rock '68, Motown '66, Jazz, Country, Hip Hop, Pop. Each pack costs 2 records; riffs 1 to 2. Locked riffs can be previewed.
- Mr. Scott may revise music choices later.

## Play mode
- 4 lanes on D F J K plus on-screen tap buttons. Chart generated from the chosen riff.
- Easy: on-beat notes, slower highway. Normal: every note.
- The played part only sounds when notes are hit. Extra presses break the streak.
- Score, streak multiplier up to x4, accuracy, 1 to 5 stars.
- The "Teacher test: +5" button is mockup-only. Remove it in the real build.

## Hosting
- Apps Script web app on the district account, loader pattern from The Exiled Crown (GitHub `live` branch for students, `main` with `?test=1`).

## Still to decide
All settled on Nov 19, 2026. See `design-plan.md`.
