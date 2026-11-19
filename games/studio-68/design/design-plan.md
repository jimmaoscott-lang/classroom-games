# Studio '68: Design Plan (Nov 19, 2026)

A Guitar Hero style review game for US History at Brazoswood High School. Students answer review questions to earn gold records, spend records on genre packs and riffs, build a 4-part song, and play it on a note highway. Reporting reuses The Exiled Crown's system.

Supersedes the "Still to decide" list in `decisions-so-far.md`. Music, song layout, and play controls from that file still stand.

## 1. Screens and flow
1. **Sign-in.** Same as The Exiled Crown: the Google account is matched to the Roster. Unknown students pick a class period and are added. Backup code box for students whose account will not sign in.
2. **Set and level pick.** Lists open sets from the Sets tab. Student picks Easy, Medium, or Hard. A new stage name is picked here the first time (word lists).
3. **Studio.** Left: question panel. Right: pack tabs, 4 part rows (drums, bass, rhythm, lead) with riff cards (preview, unlock, select), song slots, Radio button, Play button. Students can switch between answering and building at any time.
4. **Stage setup.** Pick the part to play (rhythm, bass, or lead), chart level (Easy or Normal), and assists. Timing check lives here.
5. **Play.** 4-lane highway (D F J K plus tap buttons), or 2 lanes (F J). Score, streak, multiplier up to x4, crowd meter, progress bar.
6. **Results.** Stars, accuracy, best streak. Buttons: Play again, Back to studio.
7. **Radio.** Shared songs from the same class period, credited by stage name. Play any of them on the highway.

## 2. Questions
- Format matches The Exiled Crown: Question | Correct answer | Wrong answer 1 | Wrong answer 2 | Wrong answer 3 | Wrong answer 4 (Hard only) | Resource tag | TEKS.
- Untimed. One question at a time from a shuffled deck of the set's tab. When the deck runs out it reshuffles; repeats still earn records.
- Feedback after each answer: correct or incorrect, with the correct answer shown.

| Level | Choices | Records per correct answer |
|---|---|---|
| Easy | 3 | 1 |
| Medium | 4 | 1 |
| Hard | 5 (uses Wrong answer 4; falls back to 4 choices if blank) | 2 |

## 3. Guessing detection
- Flag after 3 wrong in a row that are each faster than 1 second + 0.25 seconds per word (question plus all choices), or 3 wrong in a row in the same answer position.
- Extended time multiplies that threshold by 1.5. With read aloud on, the clock starts when the voice finishes.
- Correct answers are never flagged and reset the streak. Flagged answers are logged "Guess flag: Yes" and left out of % correct.
- Consequences:
  - 1st flag: 5-second lock. "The producer is checking your work... Slow down and read each question."
  - 2nd flag: 10-second lock, and the next correct answer earns no record.
  - 3rd flag and after: 15-second lock, and the next song's crowd meter starts at half (cosmetic).

## 4. Accommodations (Roster columns, same as The Exiled Crown)
- **Read aloud:** question and choices spoken on appear; speaker button and V key replay. Speaker buttons on pack and riff descriptions.
- **Extended time:** guessing threshold x1.5. Highway starts on Slow.
- **Reduced choices:** Easy 2 choices, Medium and Hard 3. Never fewer than 2.
- Active accommodations are logged on every answer.

### Play assists (every student, settings before each song)
- Highway speed: Slow, Normal, Fast
- Lanes: 4, or 2 (notes merge onto F and J)
- No-fail: the song always finishes
- Quiet mode: low volume plus a stronger visual hit flash
- Timing check: tap along to 8 beats; the average offset is saved per student on that Chromebook

## 5. Economy
- 7 packs. Folk '65 is free; the other 6 cost 2 records each.
- Every pack has 3 riffs per part (84 riffs). In each part: riff 1 costs 1, riff 2 costs 1, riff 3 costs 2. Folk riff 1 for drums, bass, and rhythm stays free.
- Everything costs about 100 records. Students preview any riff before buying and only unlock what they want.
- After everything is unlocked, a Platinum badge shows and records keep counting.

## 6. Play mode scoring (unchanged from mockup)
- Perfect within 0.07 sec (100 points), Good within 0.15 sec (60 points), times multiplier.
- Multiplier rises every 8 notes in a row, up to x4. Extra presses break the streak.
- Stars from accuracy: 95% 5, 85% 4, 70% 3, 50% 2, else 1.
- Crowd meter: hits raise it, misses lower it. At zero the song ends early unless no-fail is on.

## 7. Saving and the Radio
- **Saves tab:** one row per student: records, unlocked packs, unlocked riffs, up to 3 songs (name plus riff choices), stage name, guess-flag carry-over, last saved. Autosaves after every unlock or song change.
- Saves carry across sets and units. Menu "Studio 68 > New season" clears all saves after a confirm.
- Song names come from three picker lists (for example "Electric" + "Highway" + "Blues").
- **Radio:** "Send to Radio" shares a saved song with the same class period. The Radio tab lists Time, Student email, Class period, Stage name, Song name, Song data, Hide. "Hide" set to Yes removes it from the game.
- **Settings tab:** "Radio open?" Yes or No. Menu items "Turn Radio on" and "Turn Radio off". When off, the Radio button is hidden and Send to Radio is grayed out.

## 8. Teacher Sheet (its own Sheet; formats match The Exiled Crown)
| Tab | Columns | Notes |
|---|---|---|
| Roster | School email, Student name, Class period, Read aloud, Extended time, Reduced choices, Backup code | Copy from The Exiled Crown; its "Unlocked character" column is ignored if present |
| Sets | Set number, Set name, Question tab, Open? | Replaces Missions |
| Question tabs | Question, Correct answer, Wrong answer 1-3, Wrong answer 4, Resource tag, TEKS | Copy straight from The Exiled Crown |
| Results | Time, Student email, Class period, Set, Question tab, Difficulty, Question, TEKS, Right/Wrong, Accommodations active, Guess flag, Event tag | Written by the game |
| Song Plays | Time, Student email, Class period, Song name, Song owner, Part, Chart level, Assists, Accuracy, Stars, Score | Not used in reports |
| Saves, Radio, Settings | see section 7 | |
| Goals, TEKS List | same as The Exiled Crown | |
| Summary | Student email, Student name, Class period, Questions answered, % correct, Highest difficulty answered, Class most-missed questions | Rebuilt from the menu |
| Progress Report | same columns as The Exiled Crown | Rebuilt from the menu |

Teacher menu "Studio 68": Set up tabs, Update reports, Make backup codes, Turn Radio on, Turn Radio off, New season, Check game version.

## 9. Hosting and performance
- Code.gs `doGet` loads `games/studio-68/game/index.html` from GitHub: `live` branch for students, `main` with `?test=1`. Fallback: the Index.html saved in Apps Script.
- Page about 150 KB with no embedded audio. Instrument samples load per pack from jsDelivr, then raw.githubusercontent.com. If both fail, riffs play with built-in synth sounds.
- Highway switches to a light drawing mode (no glow or beat lines) if frames run slow.
- Results are sent in small batches like The Exiled Crown.

## 10. Privacy (public repo)
No student names, emails, Sheet links or IDs, or backup codes in the repo. Student data lives only in the teacher's Sheet.
