// A reply is stale when it is for the same run as the one on screen but older than it.
// Either side can be null (no run yet, or the run just ended); then nothing is stale.
export const isStaleRun = (incoming, current) => Boolean(incoming && current && incoming.id === current.id && incoming.revision < current.revision);
