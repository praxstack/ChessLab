// engine/brand.js: AskTheMove's typefaces (site/DESIGN.md): Vollkorn is the book's voice, Courier Prime the
// engine's printout, Kalam the coach's handwriting (the screen block's notes). Loaded after look.js, before the
// film is built, so every size the engine fits is measured in the real face. The fonts are the site's own
// woff2 files (SIL OFL 1.1, vendor/brand/OFL.txt).
(function () {
  if (!window.LOOK) return;
  LOOK.TYPE.serif = '"Vollkorn", Georgia, serif';
  LOOK.TYPE.mono = '"Courier Prime", ui-monospace, monospace';
  LOOK.TYPE.hand = '"Kalam", "Comic Sans MS", cursive';
  // start the loads now: main.js waits for document.fonts.ready before it builds the film
  window.BRAND_FONTS = Promise.all(['400 40px Vollkorn', '650 40px Vollkorn', '800 40px Vollkorn', '400 30px "Courier Prime"',
    '400 40px Kalam', '700 40px Kalam'].map((f) => document.fonts.load(f, 'AaQ1?→…')));
})();
