## 1. Rules
- [x] 1.1 CT-001 Course shape, limits and validation in `shared/course.js`, with tests.
- [x] 1.2 CT-002 Ladder and adaptive schedule in `shared/trainer-schedule.js`, with tests.
- [x] 1.3 CT-003 Drill session rules in `shared/drill.js`, with tests.
- [x] 1.4 CT-004 PGN and Lichess study import, PGN export in `shared/course-import.js`, with tests.

## 2. Storage and routes
- [x] 2.1 CT-005 Collections `courses`, `course_cards`, `drill_sessions`; backup version 2 that still restores version 1.
- [x] 2.2 CT-001 to CT-005 Local routes under `/api/courses`, with tests.
- [x] 2.3 Run the test suite and record environment-caused failures separately (13 native-engine tests fail in the cloud container, same as main).

## 3. Later changes (not this one)
- [ ] 3.1 Courses tab in the browser app (list, study, drill, quiz, shuffle, due-today card).
- [ ] 3.2 Content pipeline and starter catalogue.
- [ ] 3.3 Repertoire bot and "where you left the book".
- [ ] 3.4 Course builder in the app, share by static link.
