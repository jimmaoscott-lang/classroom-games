# Huddle Up: decisions so far (11/20/2026)

Full design plan: Claude doc "Huddle Up: Design Plan" (https://claude.ai/artifact/KNLXN9cbBfjS73s5PvhvZv).

## Game
- Football review game. Student is the coach, calls plays; huddle questions decide how well the play is carried out.
- Modes: Solo vs computer (difficulty = how often the computer misses its huddle: Easy 40%, Normal 25%, Hard 10%, Expert 0%); Head-to-Head on two computers (main 2-player mode, 4-letter game code, polling every 1-2 s through CacheService); Hot seat on one computer (backup, Player 2 signs in with backup code).
- Plays: offense Run Inside, Run Outside, Short Pass, Deep Pass, Play Action; defense Blitz, Zone, Man Coverage, Stack the Box. Special teams use the same huddle.
- Result weights: matchup ~40%, huddle ~35%, ratings ~15%, luck ~10%. A team that answers right should usually beat a higher-rated team that misses.

## Questions and penalties
- 4 choices: correct + Wrong answers 1-3 (Studio 68 Medium). Wrong answer 4 unused. Reduced choices: 3.
- First try correct: +2 skill points. Second-chance correct: +1. No difficulty tags.
- First miss: ONE random penalty (on-field first-miss effect, or the player in the play loses 2 rating, or team loses 1 unspent point), then a second question. Second miss: full consequence for the phase.
- Injury only after 3 wrong in a row: random player plays at starting rating for 3 plays.
- Guess flags: Studio 68 rule (3 wrong in a row each faster than 1 s + 0.25 s/word, or same position). Extended time x1.5.

## Ratings
- 8 players per team (QB, RB, WR, O-Line, D-Line, LB, Secondary, Kicker), start 60-70.
- Each +1 tap = +2 rating (teacher can set 1-3). Cap 100. Never below starting rating. Spend during breaks.

## Accommodations
- From Roster checkboxes, automatic at sign-in. Read aloud auto-reads; extended time doubles the optional play clock.

## Sheet and delivery
- Same workbook layout as Studio 68 (Sets, question tabs, Roster, Results, reports, Goals, Settings) plus a Games tab. Drop Saves, Radio, Song Plays.
- Code.gs starts from games/studio-68/apps-script/Code.gs. Page downloads from this repo (main = ?test=1, live = students).

## Look
- Look C, TV Broadcast (mockup/field-look-c.dc.html, made by mockup/make-looks.py). 3/4 sideline camera, field scrolls with the ball, preset made-up teams.

## Classroom rules
- Read-aloud off by default, Exit / Start Over on every screen, short question text, no difficulty picker for students.

## Build status
- Step 1 (art mockup): done, Look C approved.
- Step 2 (field prototype): built 11/20/2026. `src/` (page.html, main.js, test-questions.js) builds `game/index.html` with `bash src/build-game.sh`. Look C field drawn on a canvas with the mockup's projection, camera scrolls with the ball, 12-play Pelicans drive vs Comets, Run Inside animated (snap, handoff, blocking, pursuit, tackle), huddle question with second chance, first-miss random penalty, delay of game on second miss, +2/+1 skill points, downs, first downs, touchdowns. Computer defense picks a random call and misses its huddle 25% (Normal). Test switches on the title screen (and `?ra=1`, `?rc=1`). Other plays show "Coming in step 3".
