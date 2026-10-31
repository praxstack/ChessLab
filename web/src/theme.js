// Applies the colour theme setting to the page. public/theme-boot.js does the same before the first
// paint, from the saved settings, so a reload never flashes the other theme.
const metaColors = {light: '#fbfaf4', dark: '#1a2420'};

export function applyTheme(theme, root = document.documentElement) {
  if (theme === 'light' || theme === 'dark') root.dataset.theme = theme;
  else delete root.dataset.theme;
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    const scheme = meta.dataset.scheme;
    meta.content = metaColors[theme === 'light' || theme === 'dark' ? theme : scheme] || metaColors.light;
  }
}
