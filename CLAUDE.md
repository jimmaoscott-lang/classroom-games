# Classroom Games (Mr. Scott, Brazoswood High School, Brazosport ISD)

One repo for all of Mr. Scott's classroom review games. Each game is a Google Apps Script web app on the district account (access: "Anyone in brazosportisd.net") attached to a teacher's own copy of a Google Sheet.

## Layout
- `shared/reporting/` - the reporting system every game reuses (roster sign-in, backup codes, Results logging, guessing flags, Summary, Progress Report, Goals, TEKS List).
  - `exiled-crown-Code.gs.reference` is the working Code.gs from The Exiled Crown (repo `jimmaoscott-lang/castlebuildermapsanditems`). It is the starting point, not something to rewrite from scratch.
- `games/<game-name>/` - one folder per game:
  - `design/` - design plan and decisions
  - `src/` - editable source; `mockup/` or `game/` - built page
  - `apps-script/` - final files Mr. Scott pastes into Apps Script (Code.gs plus any fallback Index.html)
  - `audio/`, `art/` - assets

## How builds reach students (same pattern as The Exiled Crown)
- Code.gs `doGet` downloads the game page from this repo on every load, so page changes need no pasting.
- `main` = newest build, opened by the teacher with the web app link plus `?test=1`.
- `live` = what students get from the plain link. Update `live` from `main` only after Mr. Scott tests and says it is ready.
- Code.gs changes are pasted by hand and deployed as a new version. clasp cannot run from the Claude cloud workspace.
- Assets can load from jsDelivr (`cdn.jsdelivr.net/gh/jimmaoscott-lang/classroom-games@main/...`) with raw.githubusercontent.com as a backup.

## Working rules
- Mr. Scott does not code. Give one step per message, complete files to paste, and wait for "done".
- Writing style for messages to him: direct and concise, no em dashes, no "not X, it's Y" phrasing, no paragraphs that begin with "On".
- TEKS: always the current adopted Texas codes.
- PUBLIC REPO: never commit student names, emails, Sheet links or IDs, backup codes, or any student data.
- Test headless before delivering: Chrome at /usr/bin/google-chrome with Playwright or Puppeteer.
- Edit files in place, test, then commit and push to `main`.
