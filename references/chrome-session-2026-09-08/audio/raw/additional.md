# Additional captured audio — 8 September 2026

Direct local Whisper transcription of the captured MP3 bytes, without expected wording or displayed coach text. These are observed network responses; playback of every file is not established.

## Speech

| File | Transcript | Confidence |
|---|---|---|
| `speech-35320-536.mp3` | Let's get this over with, shall we? | High |
| `speech-35320-593.mp3` | e4. Solid way to start the game. Garry Kasparov and I approve. | High |

The raw second transcript spells the name “Gary”; the conventional spelling “Garry” is editorial. Raw ASR, token scores, timestamps, commands, source URLs and SHA256 receipts are preserved in `additional.json` and the linked per-file JSON.

## Sound effects

These six files have **no accepted speech transcript**. Source URLs identify game and result sounds. Raw ASR guessed stock phrases; those guesses must not be treated as spoken words.

| File | Duration | Source sound |
|---|---:|---|
| `observed-35320-457.mp3` | 0.542s | `correct-c1411f4.mp3` |
| `observed-35320-458.mp3` | 0.164s | `move-self-618f465.mp3` |
| `observed-35320-459.mp3` | 0.318s | `takeaway-navigate-4f46772.mp3` |
| `observed-35320-460.mp3` | 1.596s | `training-result-good-1437d1d.mp3` |
| `observed-35320-461.mp3` | 1.596s | `training-result-ok-72ffaa5.mp3` |
| `observed-35320-462.mp3` | 1.596s | `training-result-bad-f0b2ec2.mp3` |

Confidence is qualitative; model token probabilities are not calibrated probabilities of correctness. All eight input hashes were checked unchanged after processing. No project files were edited.
