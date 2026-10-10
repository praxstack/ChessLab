## 1. Coverage
- [x] 1.1 HB-004 Accept `COACH_AI_INVITE_CODES` as sign-up codes, store the code's digest at sign-up, and add the column to older databases. Test the gate with only coach codes, the stored digest, and sign-in on an upgraded database.
- [x] 1.2 AI-007 Cover every account locally and only digest-matched accounts when hosted. Report `coachAi` in `/api/me`, hide "Explain why" for uncovered accounts, keep no evidence for them, and answer `not_covered`. Test a covered and an uncovered account, and revocation by removing a code.

## 2. Daily cap
- [x] 2.1 AI-005 Add `COACH_AI_MAX_PER_DAY`, count per UTC day in SQLite (per coach code when hosted, per account locally), check the hourly quota first, and hand the hourly unit back on a daily refusal. Test the cap across a restart and a day boundary, other accounts' and codes' allowances, two accounts sharing one code, that an hourly refusal leaves the daily count unspent, and that a daily refusal leaves the next day's first hour intact.

## 3. Delivery
- [x] 3.1 Document the settings, who the key pays for, and running on a Max plan's API credits in `docs/deploy-beta.md` and `.env.example`.
- [x] 3.2 Run the test suite, the production build and strict OpenSpec validation; record environment-caused failures separately.
- [ ] 3.3 AI-005/AI-007 With the founder's own key, make one live explanation locally and confirm the daily count in `coach_daily`.
- [ ] 3.4 AI-007 On the chosen host, confirm a friends-and-family account sees "Explain why" and a tester account does not.
