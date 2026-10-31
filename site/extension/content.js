// Adds "Analyse on AskTheMove" to Chess.com's Daily Puzzle page only (it's
// unrated; the manifest matches no other page, and reader.js checks again). A tap reads the board on screen and
// opens it on askthemove.online, where the learner can draw, test a line and
// check it. Nothing is sent anywhere else and nothing is stored.
(function () {
  const R = globalThis.AskTheMoveReader;
  if (!R || !R.allowed(location.pathname) || document.getElementById('atm-send')) return;

  const btn = document.createElement('button');
  btn.id = 'atm-send';
  btn.type = 'button';
  btn.textContent = '✎ Analyse on AskTheMove';
  btn.title = 'Open this puzzle on your own AskTheMove board: pens, your line, coach check';
  const say = document.createElement('div');
  say.id = 'atm-say';
  say.setAttribute('role', 'status');
  say.hidden = true;

  btn.addEventListener('click', () => {
    const got = R.readPage(document);
    if (got.error) {
      say.textContent = got.error;
      say.hidden = false;
      setTimeout(() => {
        say.hidden = true;
      }, 4000);
      return;
    }
    window.open(R.boardUrl(got.fen), '_blank', 'noopener');
  });

  document.body.append(btn, say);
})();
