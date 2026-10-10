# Sound files for /public/sounds

## Sound effects (placeholders are already included, generated synthetically)
Replace them with nicer ones any time. Keep the same names. Short mp3, < 100 KB each.

| File                     | Used for                          |
|--------------------------|-----------------------------------|
| `tap.mp3`                | every button tap                  |
| `correct.mp3`            | cheerful ding on a right answer   |
| `wrong.mp3`              | sad trombone on a wrong answer    |
| `whoosh.mp3`             | between questions                 |
| `fanfare.mp3`            | level-complete fanfare (score ≥ 50%) |
| `drumroll.mp3`           | drumroll before the result (~2.3 s) |

## Default funny voice lines — YOU need to add these (`/public/sounds/voices/`)
Until you add them, the app speaks the same lines with the browser's Arabic text-to-speech (speechSynthesis, ar-SA).

| File                       | Line                      | Event          |
|----------------------------|---------------------------|----------------|
| `voices/wrong1.mp3`        | إنت جاد؟! (signature)     | wrong answer   |
| `voices/wrong2.mp3`        | لا لا لا مش معقول!        | wrong answer   |
| `voices/wrong3.mp3`        | يا ساتر!                  | wrong answer   |
| `voices/correct1.mp3`      | برافو!                    | correct answer |
| `voices/correct2.mp3`      | ما شاء الله عليك!         | correct answer |
| `voices/correct3.mp3`      | عرفتني صح!                | correct answer |
| `voices/low1.mp3`          | (low-score ending line)   | score < 50%    |
| `voices/high1.mp3`         | (high-score ending line)  | score ≥ 50%    |

Edit the texts / file names in `lib/phrases.ts` (`DEFAULT_VOICES`).
