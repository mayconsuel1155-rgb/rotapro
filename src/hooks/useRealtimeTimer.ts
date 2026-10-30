import { useState, useEffect } from 'react';
import { calculateDurationSeconds, formatTimerDisplay, formatDurationHuman } from '../domain/time/timeService';

export function useRealtimeTimer(startedAt?: string, endedAt?: string, isRunning = true) {
  const [seconds, setSeconds] = useState<number>(() => calculateDurationSeconds(startedAt, endedAt));

  useEffect(() => {
    // Immediate calculation
    setSeconds(calculateDurationSeconds(startedAt, endedAt));

    if (!isRunning || !startedAt || endedAt) {
      return;
    }

    const interval = setInterval(() => {
      setSeconds(calculateDurationSeconds(startedAt, endedAt));
    }, 500);

    return () => clearInterval(interval);
  }, [startedAt, endedAt, isRunning]);

  return {
    seconds,
    display: formatTimerDisplay(seconds),
    human: formatDurationHuman(seconds)
  };
}
