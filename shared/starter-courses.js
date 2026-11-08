// Starter courses written for AskTheMove (CC0). Move orders are standard opening theory; the
// chapter plan, notes and quizzes are our own words. Every line is checked by validateCourse.

export const STARTER_COURSES = [
  {
    id: 'italian-starter',
    title: 'Italian Game starter',
    blurb: 'Bring your pieces out fast against 1...e5, castle, and know the two traps everyone falls into.',
    level: 'beginner', colour: 'w', stage: 'opening',
    source: {kind: 'own', author: 'AskTheMove', licence: 'CC0'},
    chapters: [
      {
        id: 'quiet-italian', title: 'The quiet Italian',
        explain: [
          'After 1.e4 e5 2.Nf3 Nc6 3.Bc4 your bishop looks at f7, the softest square in Black\'s camp because only the king guards it.',
          'The quiet plan is c3 and d3: build a strong centre slowly, castle, and only then open the position.',
        ],
        lines: [
          {id: 'giuoco', title: 'Bishop to c5', side: 'w',
            moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'c2c3', 'g8f6', 'd2d3', 'd7d6', 'e1g1'],
            notes: {5: 'The bishop points straight at f7.', 7: 'c3 prepares d4 later and gives the bishop a retreat on c2 or b3.', 9: 'Solid: the e4 pawn is guarded and the dark bishop still has c1-h6 open.', 11: 'Castle before anything sharp. Your king is safe, now plan Re1, Nbd2 and Bb3.'},
            marks: {5: [{from: 'c4', to: 'f7', color: 'R'}]}},
          {id: 'two-knights', title: 'Knight to f6 early', side: 'w',
            moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'g8f6', 'd2d3', 'f8e7', 'e1g1', 'e8g8', 'f1e1'],
            notes: {7: 'd3 guards e4 without allowing tricks. Ng5 ideas are sharp; we keep it calm.', 11: 'Re1 backs up e4 and gets ready for c3 and d4.'}},
        ],
        quizzes: [
          {id: 'why-f7', question: 'Why does the bishop go to c4 in the Italian?', choices: ['It aims at f7, which only the king defends', 'It guards the e4 pawn', 'It stops Black from castling'], answer: 0, why: 'f7 is the weak point in Black\'s camp at the start. The bishop on c4 adds pressure there and supports ideas like Ng5.'},
        ],
      },
      {
        id: 'traps', title: 'Traps to know',
        explain: ['Two short lines every Italian player meets. Learn the punishments so you never fall for them, and so you collect free points when your opponent does.'],
        lines: [
          {id: 'legal-trap', title: 'Black grabs the queen too early', side: 'w',
            moves: ['e2e4', 'e7e5', 'g1f3', 'd7d6', 'f1c4', 'c8g4', 'b1c3', 'g7g6', 'f3e5', 'g4d1', 'c4f7', 'e8e7', 'c3d5'],
            notes: {9: 'Give up the queen! The pin on f3 was not a real pin.', 11: 'Check, and the king has only e7.', 13: 'Checkmate. The minor pieces did all the work.'}},
          {id: 'fried-liver-guard', title: 'Stop the knight jump to g5', side: 'b',
            moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'f3g5', 'g8h6'],
            notes: {7: 'White threatens Nxf7 forking queen and rook.', 8: 'Nh6 guards f7 a second time. Calm, and the knight on g5 now looks silly.'}},
        ],
        quizzes: [
          {id: 'legal-idea', question: 'In the first trap, why can White give up the queen?', choices: ['Because the bishop and knights deliver mate', 'Because the queen was attacked anyway', 'Because Black cannot recapture'], answer: 0, why: 'After Bxf7+ Ke7 Nd5 the king is mated. A pin against the queen is not a pin if moving the piece wins more.'},
          {id: 'legal-spot', fen: 'rn1qkbnr/ppp2p1p/3p2p1/4p3/2B1P1b1/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 5', question: 'White to move. Which move springs the trap?', choices: ['Nxe5, letting the queen go', 'h3, asking the bishop', 'd3, quiet development'], answer: 0, why: 'Nxe5 drops the queen on purpose. If Black takes it, Bxf7+ Ke7 Nd5 is mate.'},
        ],
      },
    ],
  },
];
