import { describe, it, expect } from 'vitest';
import { 
  formatDateBr, 
  formatTime24h, 
  formatTimerDisplay, 
  formatDurationHuman, 
  calculateDurationSeconds 
} from '../domain/time/timeService';

describe('timeService', () => {
  it('formats YYYY-MM-DD to Brazilian dd/MM/yyyy', () => {
    expect(formatDateBr('2026-10-29')).toBe('29/10/2026');
    expect(formatDateBr(undefined)).toBe('--/--/----');
  });

  it('formats ISO string to 24-hour time HH:mm', () => {
    const testIso = '2026-10-29T14:35:00.000Z';
    const date = new Date(testIso);
    const expected = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    expect(formatTime24h(testIso)).toBe(expected);
  });

  it('calculates duration in integer seconds correctly', () => {
    const start = '2026-10-29T10:00:00.000Z';
    const end = '2026-10-29T10:15:30.000Z';
    expect(calculateDurationSeconds(start, end)).toBe(930); // 15 mins 30 secs
  });

  it('formats stopwatch display HH:MM:SS accurately', () => {
    expect(formatTimerDisplay(0)).toBe('00:00:00');
    expect(formatTimerDisplay(65)).toBe('00:01:05');
    expect(formatTimerDisplay(3665)).toBe('01:01:05');
  });

  it('formats human readable duration', () => {
    expect(formatDurationHuman(45)).toBe('45 s');
    expect(formatDurationHuman(120)).toBe('2 min');
    expect(formatDurationHuman(3660)).toBe('1h 1min');
  });
});
