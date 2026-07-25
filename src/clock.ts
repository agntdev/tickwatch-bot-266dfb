/** A single clock seam for schedules, cooldowns, and time-window decisions. */
let readClock = () => new Date();

export function now(): Date {
  return readClock();
}

/** Test-only hook for deterministic scheduled-notification tests. */
export function setClock(source: () => Date): void {
  readClock = source;
}
