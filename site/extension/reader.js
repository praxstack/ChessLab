// Reads the position off a Chess.com puzzle page, in the learner's own
// browser, from the board that is already on screen. No login, no Chess.com
// API: just the piece elements ("piece wk square-51" = white king on e1).
// Shared by the extension (content.js) and the "Send to my board" bookmark.
(function (root) {
  const FILES = 'abcdefgh';
  const BOARD = 'https://askthemove.online/puzzleanalyzr/';

  /** "wk", "square-51" style classes -> { e1: 'K', ... } (upper case white, lower case black). */
  function piecesFromClasses(list) {
    const out = {};
    for (const cls of list) {
      const names = String(cls).split(/\s+/);
      if (!names.includes('piece')) continue;
      const kind = names.find((n) => /^[wb][kqrbnp]$/.test(n));
      const at = names.find((n) => /^square-[1-8][1-8]$/.test(n));
      if (!kind || !at) continue;
      const sq = FILES[Number(at[7]) - 1] + at[8];
      out[sq] = kind[0] === 'w' ? kind[1].toUpperCase() : kind[1];
    }
    return out;
  }

  /** Whose move it is: from the page's own words ("Black to Move"), else the side the board faces. */
  function sideToMove(text, flipped) {
    const m = /\b(white|black)\s+to\s+move\b/i.exec(text || '');
    if (m) return m[1].toLowerCase() === 'black' ? 'b' : 'w';
    return flipped ? 'b' : 'w';
  }

  /**
   * Castling rights as a printed diagram reads them: a king and rook still on
   * their home squares may castle. The page doesn't say whether they moved
   * earlier, so this is the usual guess. (En passant can't be read from a
   * still board; Daily Puzzles start after the opponent's move, and that
   * capture is very rare, so it stays "-".)
   */
  function castling(p) {
    let out = '';
    if (p.e1 === 'K' && p.h1 === 'R') out += 'K';
    if (p.e1 === 'K' && p.a1 === 'R') out += 'Q';
    if (p.e8 === 'k' && p.h8 === 'r') out += 'k';
    if (p.e8 === 'k' && p.a8 === 'r') out += 'q';
    return out || '-';
  }

  /** The pieces as a FEN, or { error } when it isn't a real position. */
  function toFen(pieces, side) {
    const all = Object.values(pieces);
    if (all.filter((p) => p === 'K').length !== 1 || all.filter((p) => p === 'k').length !== 1) {
      return { error: 'Couldn’t read the board. Open a puzzle so its pieces are on screen, then try again.' };
    }
    const rows = [];
    for (let r = 8; r >= 1; r -= 1) {
      let row = '';
      let gap = 0;
      for (const f of FILES) {
        const p = pieces[f + r];
        if (p) {
          if (gap) row += gap;
          gap = 0;
          row += p;
        } else gap += 1;
      }
      rows.push(row + (gap || ''));
    }
    return { fen: `${rows.join('/')} ${side} ${castling(pieces)} - 0 1` };
  }

  /**
   * Only the Daily Puzzle page, which is unrated. Chess.com's fair-play rules
   * ban engines on rated puzzles, Puzzle Rush and games, so never there.
   */
  function allowed(path) {
    return /^\/daily-chess-puzzle(\/|$)/.test(path || '');
  }

  /** Read the board from a page (document). */
  function readPage(doc) {
    const path = doc.location ? doc.location.pathname : '';
    if (!allowed(path)) return { error: 'This only works on Chess.com’s Daily Puzzle page (it’s unrated). Rated puzzles, Puzzle Rush and games are off limits.' };
    const board = doc.querySelector('wc-chess-board, chess-board, .board');
    if (!board) return { error: 'No board on this page. Open a Chess.com puzzle first.' };
    const classes = [...board.querySelectorAll('.piece')].map((el) => el.getAttribute('class') || '');
    const flipped = /\bflipped\b/.test(board.getAttribute('class') || '');
    return toFen(piecesFromClasses(classes), sideToMove(doc.body ? doc.body.innerText : '', flipped));
  }

  function boardUrl(fen, from = 'chesscom') {
    // After # so the position never reaches any server, ours included.
    return `${BOARD}#fen=${encodeURIComponent(fen)}&from=${from}`;
  }

  root.AskTheMoveReader = { allowed, piecesFromClasses, sideToMove, toFen, readPage, boardUrl };
})(typeof globalThis !== 'undefined' ? globalThis : this);
