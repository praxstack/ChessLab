// Run in CUA after a guest selects A rook left loose, submits d3-e4, and signs in.
// `tab` must be the already-selected ChessLab browser tab.
async function assertPuzzleResumed(tab) {
  const state = await tab.playwright.domSnapshot();
  if (!state.includes('Puzzle complete')) {
    throw new Error('After sign-in the submitted d3-e4 move must finish the puzzle without a second move');
  }
}
// await assertPuzzleResumed(tab);
