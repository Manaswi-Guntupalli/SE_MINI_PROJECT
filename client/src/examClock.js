// Wall clock changes after synchronization cannot extend an attempt.
export function synchronizeClock(deadline, serverTime, receivedAt = performance.now()) {
  const remaining = Date.parse(deadline) - Date.parse(serverTime);
  return { remaining: Number.isFinite(remaining) ? Math.max(0, remaining) : 0, receivedAt };
}
export function remainingTime(clock, now = performance.now()) {
  return Math.max(0, clock.remaining - Math.max(0, now - clock.receivedAt));
}
export function formatRemaining(milliseconds) {
  const seconds = Math.ceil(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
