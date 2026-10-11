// An engine can play this game when it is installed and, for Chess960, supports that variant.
export const compatibleEngine = (item, variant) => !!item?.available && (variant !== 'chess960' || !!item.chess960);

// Says why Play is off, so the button is never disabled without a reason. Names an engine only when it is the one selected.
export function playBlockedReason({engines, engine, variant}) {
  // An empty list means the roster did not load, and that error is already shown.
  if (!engines.length) return null;
  if (!engine) {
    if (engines.some(item => compatibleEngine(item, variant))) return 'Choose an opponent engine under Game options.';
    if (variant === 'chess960' && engines.some(item => item.available)) return 'No installed engine plays Chess960. Choose Standard under Game options.';
    return 'Play is unavailable. No opponent engine is installed on this server.';
  }
  if (!engine.available) return `Play is unavailable. ${engine.reason || `${engine.name} is not installed on this server.`}`;
  if (!compatibleEngine(engine, variant)) return `${engine.name} plays standard chess only. Choose another engine under Game options.`;
  return null;
}
