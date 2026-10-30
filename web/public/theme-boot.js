// Sets the saved colour theme before the first paint, so the page never flashes the other theme.
// A file rather than an inline script, because the content-security policy allows only 'self'.
// src/theme.js applies later changes from Settings.
(function () {
  var theme;
  try { theme = JSON.parse(localStorage.getItem('chesslab-settings') || '{}').theme; } catch (e) { theme = null; }
  if (theme !== 'light' && theme !== 'dark') return;
  document.documentElement.setAttribute('data-theme', theme);
  var color = theme === 'dark' ? '#1a2420' : '#fbfaf4';
  var metas = document.querySelectorAll('meta[name="theme-color"]');
  for (var i = 0; i < metas.length; i++) metas[i].setAttribute('content', color);
})();
