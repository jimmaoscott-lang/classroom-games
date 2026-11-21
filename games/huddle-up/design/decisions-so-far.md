# Huddle Up: decisions so far (11/20/2026)

Full design plan: Claude doc "Huddle Up: Design Plan" (https://claude.ai/artifact/KNLXN9cbBfjS73s5PvhvZv).

## Game
- Football review game. Student is the coach, calls plays; huddle questions decide how well the play is carried out.
- Modes: Solo vs computer (difficulty = how often the computer misses its huddle: Easy 40%, Normal 25%, Hard 10%, Expert 0%); Head-to-Head on two computers (the only 2-player mode, 4-letter game code, polling every 1-2 s through CacheService). Hot seat mode dropped 11/20/2026 (Mr. Scott's call); build steps renumbered: 7 special teams, 8 Google Sheet (Code.gs) and reports, 9 classroom test and balance.
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
- Position duels (changed 11/20, build 0.5.2): every position matters on the plays it is part of. O-Line vs D-Line (D-Line + LB on a Blitz) = run push and sacks on all passes. RB vs LB = breaking tackles, big runs, fumbles. QB vs Secondary = completions and interceptions. WR vs Secondary = completions and yards after catch. RB vs LB on Play Action = selling the fake. Their average is the ratings part of the result. Strength tuned so right answers still beat an 80-rated team that misses; a full roster of 100s that misses plays about even with a 60s team that answers. Examples at even 65s: D-Line 100 sacks 3.5% -> 6%, RB 100 runs outside 3.4 -> 4.8 yards, Secondary 100 incompletions 31% -> 38%.
- Pass rush animation: D-Line pushes into the pocket and chases the QB; how close depends on the O-Line vs D-Line duel. Blitz (0.5.3): all 3 linebackers rush on passes (edges and A gap) and get closer than the D-Line; on runs they shoot the gaps into the backfield.
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
- Step 3 (all plays + result math): built 11/20/2026. Source split into src/core.js (constants, matchup chart, ratings table), src/draw.js (Look C drawing), src/plays.js (formations, result math, animations), src/main.js (game flow). Quick game for testing: 4 quarters x 6 plays. Pelicans play offense and defense; Comets are the computer coach (situational play calls, 25% huddle misses).
  - All 5 offense plays animated (inside handoff, outside pitch, short/deep/play-action passes with dropbacks, routes, ball flight, coverage) for both directions. Outcomes: gains, losses, completions, incompletions, sacks, interceptions (return, touchback, pick six), fumbles, touchdowns, safeties.
  - Result math: T = 0.40 matchup + 0.35 huddle + 0.15 ratings + 0.10 luck. Huddle term: offense clean +0.6 / shaky -0.4; defense clean -0.3 / shaky +0.4 / blown +0.9. First-miss on-field effects: slower snap (-0.25) or slower read (+0.25). Deep vs Blitz = risky (more sacks, more completions).
  - Defense huddle: second miss = missed assignment (blown), play still runs with big-play risk.
  - 4th down: Go For It / Punt (automatic net ~40) / Field Goal (step 8). Kickoffs are automatic touchbacks at the 25; extra points automatic; halftime gives the Comets the ball.
  - tests/balance-test.js confirms an offense that answers right with ratings 62 out-gains one that misses with ratings 80, for every play.
- Step 4 (huddle penalties, injuries, skill-point breaks): built 11/20/2026. Build 0.4.0. Tested by Mr. Scott 11/20: all working.
  - Injuries: 3 wrong answers in a row (second chances count) shake up one random Pelicans player, picked first from players who have bought rating points so the injury matters. He plays at his starting rating for 3 plays, counting the current one. Trainer icon (red cross) shows over him on the field and in the panel, and on his break card. Right answer resets the streak.
  - Breaks after a score, a change of possession, and each quarter end (halftime too). Quarter breaks always show the roster; score and possession breaks show it only when the student has points to spend. Tap a player, tap +1 (+2 rating, cap 100). Unspent points carry over.
  - Computer team gets points at every break, spent on its lowest-rated players: Easy 2, Normal 4, Hard 5, Expert 6. Test with `?diff=Easy` etc. `?rpp=1|2|3` tests the rating-per-point setting.
  - Guess flags: Studio 68 rule. Reading clock starts after read-aloud finishes. Flag shows a "Ref review" lock screen: 5 s the first time, 10 s after that. Flagged answers are left out of % correct on the final screen.
  - Every answer is logged in the page (time, question, TEKS, Right/Wrong, accommodations, guess flag, event tag) for the Results tab in step 9.
  - Test option added: Extended time (`?et=1`).
  - Tests: tests/step4-test.js checks injuries, countdown, trainer chip, guess lock, break spending, cap, computer points, rating floor, halftime.
- Step 5 (solo computer coach): built 11/20/2026. Build 0.5.0.
  - Computer play calls: down and distance first, then game situation (short field: fewer deep passes; behind late: throw more and blitz more; ahead late: run more and play zone). Then it reads the student's last 6 calls on that side and leans toward the call that beats the habit. When the read works, the result banner says "Comets coach is keying on your Run Inside. Mix it up!"
  - Play calling is the same at every difficulty. Difficulty still only sets how often the computer misses each huddle question (Easy 40%, Normal 25%, Hard 10%, Expert 0%) and its break points (2/4/5/6).
  - The computer goes through the same huddle as the student: a first miss gives a random penalty (on-field effect or a player in the play loses 2 rating), a second miss gives the full consequence (Comets delay of game on offense, missed assignment on defense), and 3 misses in a row shake up a Comets player (trainer icon on their side too).
  - 4th down: goes for it on 4th & 1 past its own 30, 4th & 3 or less inside the Pelicans 40, behind late on 4th & 10 or less, and on the last play unless ahead. Ahead late it only goes on 4th & 1 inside the 40. Field goals join in step 7 (special teams).
  - Game length is now a setting: Quick (6 plays a quarter), Standard (12, the default), Full Period (18). Title screen has test pickers for game length and computer difficulty (`?len=Quick`, `?diff=Hard` also work). The teacher gear menu with the PIN comes with the Sheet in step 8.
  - Open question for later: play clock (Off/15/20/30) is in the design but what happens when it runs out is not decided yet.
  - Tests: tests/step5-test.js checks tendency reads, late-game calls, 4th down choices, miss rates for each difficulty, Comets delay of game, Comets injuries. Tests run Quick games.
- Step 6 (Head-to-Head on two computers): built 11/20/2026. Build 0.6.0.
  - Title screen: Solo · Kick Off, Head-to-Head, Join a Game. Head-to-Head shows a 4-letter code (no I or O); that coach is the Pelicans. Join a Game takes the code (any case); that coach is the Comets and gets the host's game length. Wrong codes and a third coach are refused.
  - Lockstep sync (src/net.js): each computer runs its own huddle, then presses "Ready to snap", which sends its call, huddle result (clean/shaky/delay/blown), on-field penalty effects and its team's ratings. When both are in, both computers run the same result math and animation with the same random seed (game seed + play number), so both screens match. Calls stay secret until the snap. Starting ratings come from the shared seed too.
  - 4th down: the offense coach picks Go For It or Punt; the defense coach waits. Punts use the shared seed.
  - Breaks: each coach spends his or her own points; new ratings go with the next Ready. No computer coach in Head-to-Head.
  - Polling: every 1.2 s while waiting on the other coach, every 5 s otherwise. After 45 s of waiting a hint says to press Exit if the other coach left. Exit sends a "left the game" message; the other screen shows it.
  - Code.gs starter (apps-script/Code.gs + Index.html): serves the page from GitHub (?test=1 = main) and has h2hCreate, h2hJoin, h2hSend, h2hPoll on CacheService (6 hours). Each side writes only its own message keys, so no lock is needed for messages. Step 8 replaces the rest of Code.gs; the Head-to-Head part carries over.
  - Outside Apps Script (downloaded file or test page) the game uses browser storage, so two windows of the same browser can play each other. `?net=local` forces that.
  - Sign-in by Google account per player, picking a question set, and writing finished games to the Games tab come with step 8.
  - Tests: tests/step6-test.js (two windows: codes, join errors, secret calls, same result on both screens, two full games matched play by play, leaving) and tests/step6-gas-test.js (same game through the real Code.gs functions with CacheService mocked, two separate browsers).
- Step 7 (special teams): built 11/20/2026. Build 0.7.0. Code in src/kicks.js (formations, result math, animations, goal posts) and main.js (showKick, startKick, kickGo, finishKick).
  - Every kick uses the huddle. Kicking team: Kickoff, Punt, Field goal or Extra point huddle. Receiving team on kickoffs and punts: Return huddle. Field goals and extra points have no defense huddle (the defense watches; in Head-to-Head it waits).
  - First miss: one random penalty as before. On-field options: shorter kick (kickoff -10 yards, punt -8), harder field goal (range -6 yards), return blocking breaks down. Rating option: Kicker (kicks) or RB/WR (returns).
  - Second miss: kickoff shanked out of bounds (receiving team at its 40); punt bad snap (45% blocked, else a 12-25 yard shank); field goal or extra point bad snap (make chance x0.2); return team confused (fumble 12% vs 1.5%).
  - Kickoff from the 35 (free kick from the 20 after a safety): ~64 yards, kicker rating adds; ~30% touchbacks (ball at 25); returns average about the 27. Punts ~41 yards; touchback at the 20, downed inside the 10, fair catches 30% (12% if the punter missed). Returns: return huddle ~35%, kicking huddle ~35%, RB vs coverage Linebacker ~15%, luck ~10%; return touchdowns possible.
  - Field goals: distance = yards to goal + 17. A 65 kicker makes about half from 48 yards; each kicker point adds 0.3 yards. Field Goal button shows the distance and is off past 62 yards. Missed field goal: other team gets the ball at the spot, or its 20 if that is better.
  - Touchdowns are 6, then an extra point from the 15 (32 yards, ~97%). Pick sixes and return touchdowns too. Then the scoring team kicks off.
  - Game opens with a Comets kickoff to the Pelicans; Pelicans kick off to start the 2nd half. Punts and field goals count as plays; kickoffs and extra points do not. No break after a kickoff by itself; the quarter break shows once even when kicks follow the last play.
  - Computer coach: on 4th down, when not going for it, tries a field goal if the make chance is about 45% or better (fgDistance <= 51 at kicker 65), otherwise punts. Same huddle miss rates as plays.
  - Head-to-Head: kicks sync the same way as plays (seeded by an event counter G.seq that counts plays and kicks). 4th down message now carries go, punt or fg.
  - Tests: tests/step7-test.js (kick math, animations for every outcome both directions, kickoff/PAT/FG/punt/safety/halftime flow, reduced choices). Older tests skip the opening kickoff.
- Step 8 (Google Sheet connection and reports): built 11/21/2026. Build 0.8.0, Code.gs Build 8.
  - apps-script/Code.gs is the full version, built from Studio 68's: serves the page (doGet adds `SERVER_TEST` so only the ?test=1 link shows the test options), Roster sign-in, period sign-up, backup codes, Sets, question tabs, Results, Games, Settings, Goals, reports, Head-to-Head. Dropped: Saves, Radio, Song Plays, Difficulty column.
  - Menu "Huddle Up": Set up tabs, Update reports, Make student report, Make backup codes, Check game version.
  - Settings tab rows: Teacher PIN (blank until the teacher types one), Game length (Quick / Standard / Full Period / 3 to 25 plays a quarter), Computer difficulty, Rating per skill point, Play clock (Off/15/20/30), Read aloud for everyone, Report start and end dates. The page never receives the PIN.
  - Gear icon on the title screen: PIN, then the settings form; saves to the Settings tab and applies right away.
  - Flow: Loading > sign-in (period or backup code when needed) > title (shows name and period) > Solo or Head-to-Head > pick a set (skipped with one open set) > game. Join a Game uses the set, game length and +1 value of the coach who made the game.
  - Accommodations from Roster checkboxes. "Read aloud for everyone" reads questions for all but is not logged as an accommodation.
  - Play clock decision (made in this build, can change): running out counts as a missed answer (first miss penalty, second chance, logged Wrong with "play clock ran out"). Extended time doubles it. Hidden when Off.
  - Results: one row per answer, sent in small batches (last 2 held back in case they get guess-flagged), flushed at the final screen, Exit, and when the tab closes. Event tag adds "· Head-to-Head" in 2-player games.
  - Games: one row per game. Solo: Player 2 = Computer. Head-to-Head: host = Player 1, guest = Player 2; both computers send it and Code.gs writes only the first (cache key h2h_CODE_logged). Exit / Start Over or the other coach leaving writes Finished? No with the score so far.
  - Reports: Summary (Games played column replaces Highest difficulty), Progress Report, Class Overview (games count per period), Student Report (GAMES section replaces SONGS).
  - Final screen: Copy Results button (text for Google Classroom; falls back to a select-and-copy box), "Saved to the class Sheet" note.
  - Not in this step: team picker (preset teams), still Pelicans vs Comets.
