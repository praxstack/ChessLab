// The hero walkthrough: Légal's mate, seen from Black's side.
// 1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Nc3 g6 5.Nxe5 Bxd1?? 6.Bxf7+ Ke7 7.Nd5#
//
// Every position, arrow and claim here is checked by test/demo-chess.test.js
// with chess.js. Engine figures were produced locally with Stockfish 19
// (WASM build, depth 20) on 2026-10-08 and are quoted as estimates.
//
// fen = piece placement only. last = [from, to] of the move just played.
// Arrow tones: "idea" (a move being considered), "threat" (an attack),
// "cover" (a square a piece controls). Mark tones: "idea", "danger", "mate",
// "covered" (an escape square a White piece controls).

export const DEMO = {
  orientation: 'black',
  // Moves before the first step, replayed by the test.
  opening: ['e4', 'e5', 'Nf3', 'd6', 'Bc4', 'Bg4', 'Nc3', 'g6', 'Nxe5'],
  main: [
    {
      id: 'position',
      strip: 0,
      play: [],
      fen: 'rn1qkbnr/ppp2p1p/3p2p1/4N3/2B1P1b1/2N5/PPPP1PPP/R1BQK2R',
      last: ['f3', 'e5'],
      arrows: [{ from: 'g4', to: 'd1', tone: 'idea' }],
      marks: [{ sq: 'd1', tone: 'idea' }],
      label: 'Move 5 · Black to play',
      title: 'White just took on e5.',
      body: 'The knight left f3, so your bishop on g4 now attacks White’s queen. Winning a queen for a bishop looks like an easy decision.',
      evidence: 'Rules check: Bg4 attacks the queen on d1',
    },
    {
      id: 'blunder',
      strip: 1,
      play: ['Bxd1'],
      fen: 'rn1qkbnr/ppp2p1p/3p2p1/4N3/2B1P3/2N5/PPPP1PPP/R1BbK2R',
      last: ['g4', 'd1'],
      arrows: [],
      marks: [],
      badge: { sq: 'd1', text: '??', tone: 'blunder' },
      label: '5…Bxd1??',
      title: 'You took the queen.',
      body: 'A review marks this as a blunder: White mates in two. That is the verdict. It doesn’t tell you what you missed.',
      evidence: 'Stockfish 19, depth 20: mate in 2 for White',
    },
    {
      id: 'why',
      strip: 1,
      play: [],
      fen: 'rn1qkbnr/ppp2p1p/3p2p1/4N3/2B1P3/2N5/PPPP1PPP/R1BbK2R',
      last: ['g4', 'd1'],
      arrows: [
        { from: 'c4', to: 'f7', tone: 'threat' },
        { from: 'e5', to: 'f7', tone: 'threat' },
      ],
      marks: [{ sq: 'f7', tone: 'danger' }],
      badge: { sq: 'd1', text: '??', tone: 'blunder' },
      label: 'Why it fails',
      title: 'The queen was bait.',
      body: 'Two White pieces already aim at f7, right next to your king, and only the king defends it. You spent your move on the queen while that attack was ready.',
      evidence: 'Rules check: f7 is attacked by Bc4 and Ne5, defended only by the king',
    },
    {
      id: 'check',
      strip: 3,
      play: ['Bxf7+', 'Ke7'],
      frames: ['rn1qkbnr/ppp2B1p/3p2p1/4N3/4P3/2N5/PPPP1PPP/R1BbK2R'],
      fen: 'rn1q1bnr/ppp1kB1p/3p2p1/4N3/4P3/2N5/PPPP1PPP/R1BbK2R',
      last: ['e8', 'e7'],
      arrows: [{ from: 'c3', to: 'd5', tone: 'idea' }],
      marks: [{ sq: 'e7', tone: 'danger' }],
      label: '6.Bxf7+ Ke7',
      title: 'Check, and only one way out.',
      body: 'After 6.Bxf7+ your king has a single legal move, Ke7. The other squares are covered by White or blocked by your own pieces. Now look at d5.',
      evidence: 'Rules check: 6…Ke7 was the only legal reply',
    },
    {
      id: 'mate',
      strip: 4,
      play: ['Nd5#'],
      fen: 'rn1q1bnr/ppp1kB1p/3p2p1/3NN3/4P3/8/PPPP1PPP/R1BbK2R',
      last: ['c3', 'd5'],
      arrows: [],
      // The checking knight, and the king's empty escape squares, each covered by White.
      marks: [
        { sq: 'e7', tone: 'mate' },
        { sq: 'd5', tone: 'danger' },
        { sq: 'd7', tone: 'covered' },
        { sq: 'f6', tone: 'covered' },
        { sq: 'e6', tone: 'covered' },
        { sq: 'e8', tone: 'covered' },
      ],
      badge: { sq: 'e7', text: '#', tone: 'mate' },
      label: '7.Nd5#',
      title: 'Checkmate.',
      body: 'The knight checks from d5. The knights cover d7 and f6, the bishop covers e6 and e8, and the e5 knight protects the bishop. Your own pieces block the rest.',
      evidence: 'Rules check: checkmate, and every Black reply on the way was searched',
    },
  ],
  branch: {
    from: 0, // branches from the position in main[0]
    steps: [
      {
        id: 'branch',
        strip: 'b',
        play: ['dxe5', 'Qxg4'],
        frames: ['rn1qkbnr/ppp2p1p/6p1/4p3/2B1P1b1/2N5/PPPP1PPP/R1BQK2R'],
        fen: 'rn1qkbnr/ppp2p1p/6p1/4p3/2B1P1Q1/2N5/PPPP1PPP/R1B1K2R',
        last: ['d1', 'g4'],
        arrows: [],
        marks: [],
        label: 'Your branch · 5…dxe5 6.Qxg4',
        title: 'What if you take the knight instead?',
        body: '5…dxe5 removes the knight that was attacking f7. White takes your bishop with 6.Qxg4, and you are a pawn down. Worse, but you are still playing a game instead of losing in two moves.',
        evidence: 'Stockfish 19, depth 20: about +2.3 for White (an estimate)',
      },
    ],
  },
  // The move strip under the board. Figurines use the piece letters.
  strip: [
    { n: '5.', san: 'Nxe5', color: 'w' },
    { n: '5…', san: 'Bxd1', color: 'b', note: '??' },
    { n: '6.', san: 'Bxf7+', color: 'w' },
    { n: '6…', san: 'Ke7', color: 'b' },
    { n: '7.', san: 'Nd5#', color: 'w' },
  ],
  branchStrip: [
    { n: '5…', san: 'dxe5', color: 'b' },
    { n: '6.', san: 'Qxg4', color: 'w' },
  ],
};
