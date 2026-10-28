import { it, expect, vi } from 'vitest';
import { synchronizeClock, remainingTime, formatRemaining } from './examClock';
it('#46 countdown uses server time and monotonic elapsed time, ignoring device clock changes', () => {
  const clock = synchronizeClock('2026-10-28T10:01:00Z', '2026-10-28T10:00:00Z', 100);
  const spy = vi.spyOn(Date, 'now').mockReturnValue(0);
  expect(remainingTime(clock, 30100)).toBe(30000);
  spy.mockReturnValue(9999999999999);
  expect(remainingTime(clock, 60100)).toBe(0);
  expect(remainingTime(clock, 70100)).toBe(0);
  spy.mockRestore();
});
it('#46 reload cannot restore elapsed time; invalid synchronization locks editing', () => {
  expect(remainingTime(synchronizeClock('2026-10-28T10:01:00Z', '2026-10-28T10:00:50Z', 0), 0)).toBe(10000);
  expect(remainingTime(synchronizeClock('invalid', 'invalid', 0), 0)).toBe(0);
  expect(formatRemaining(61000)).toBe('1:01');
});
