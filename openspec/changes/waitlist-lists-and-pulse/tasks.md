## 1. Data
- [x] 1.1 Migration 0002: lists, lists_updated_at, manage_token, pulse_token, answers; backfill existing rows.
- [x] 1.2 WL-002 Store the listed fields and nothing else.

## 2. Sign-up
- [x] 2.1 WL-004 Same answer shape for new, existing and honeypot sign-ups; manage code never returned; repeat sign-ups never mutate.

## 3. The manage link
- [x] 3.1 WL-008 Server-rendered manage page with the site's security headers and no-referrer; uncounted page views; "later" state for limits and outages.
- [x] 3.2 WL-009 Preferences, unsubscribe, one-click unsubscribe, clearing on leaving every list.
- [x] 3.3 WL-010 Self-delete.

## 4. The market pulse
- [x] 4.1 WL-007, WL-011 Lists and pulse from one config; rendered by the build; versioned answers; empty wish clears.

## 5. Admin
- [x] 5.1 WL-012 Stats endpoint; export gains lists, answers, manage_url.

## 6. Words
- [x] 6.1 WL-013 Privacy notice and landing page match the code.

## 7. Launch (founder)
- [ ] 7.1 Apply migration 0002 remotely, deploy, run the backfill line from the README.
- [ ] 7.2 Choose an email provider; put the manage link and the List-Unsubscribe headers in every send.
- [ ] 7.3 Read the privacy notice and remove its "not yet reviewed" banner.
