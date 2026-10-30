import { describe, it, expect } from 'vitest';
import { calculateJourneyStats, canReorderStop, getActiveStop, getNextPendingStop } from '../domain/journey/journeyEngine';
import type { Journey, JourneyStop } from '../types';

describe('journeyEngine', () => {
  it('calculates journey stats correctly from real timestamps', () => {
    const mockJourney: Journey = {
      id: 'j-1',
      date: '2026-10-29',
      status: 'completed',
      startedAt: '2026-10-29T08:00:00.000Z',
      endedAt: '2026-10-29T12:00:00.000Z',
      createdAt: '2026-10-29T07:50:00.000Z',
      updatedAt: '2026-10-29T12:00:00.000Z'
    };

    const mockStops: JourneyStop[] = [
      {
        id: 's-1',
        journeyId: 'j-1',
        clientId: 'c-1',
        position: 1,
        status: 'completed',
        travelStartedAt: '2026-10-29T08:00:00.000Z',
        arrivedAt: '2026-10-29T08:30:00.000Z', // 1800s travel
        serviceStartedAt: '2026-10-29T08:35:00.000Z',
        serviceEndedAt: '2026-10-29T09:15:00.000Z', // 2400s service
        isReturnToBase: false
      },
      {
        id: 's-2',
        journeyId: 'j-1',
        clientId: 'c-2',
        position: 2,
        status: 'skipped',
        isReturnToBase: false
      },
      {
        id: 's-return',
        journeyId: 'j-1',
        clientId: 'return_to_base',
        position: 3,
        status: 'completed',
        travelStartedAt: '2026-10-29T11:20:00.000Z',
        travelEndedAt: '2026-10-29T12:00:00.000Z', // 2400s travel
        isReturnToBase: true
      }
    ];

    const stats = calculateJourneyStats(mockJourney, mockStops);

    expect(stats.totalStops).toBe(2); // Only client stops count towards total visits
    expect(stats.completedStops).toBe(1);
    expect(stats.skippedStops).toBe(1);
    expect(stats.cancelledStops).toBe(0);
    expect(stats.totalTravelSeconds).toBe(1800 + 2400); // 4200s
    expect(stats.totalServiceSeconds).toBe(2400);
    expect(stats.totalDurationSeconds).toBe(14400); // 4 hours = 14400s
  });

  it('determines if stop can be reordered', () => {
    const pendingStop: JourneyStop = {
      id: 's-1',
      journeyId: 'j-1',
      clientId: 'c-1',
      position: 1,
      status: 'pending',
      isReturnToBase: false
    };

    const completedStop: JourneyStop = {
      ...pendingStop,
      status: 'completed'
    };

    const returnStop: JourneyStop = {
      ...pendingStop,
      isReturnToBase: true
    };

    expect(canReorderStop(pendingStop)).toBe(true);
    expect(canReorderStop(completedStop)).toBe(false);
    expect(canReorderStop(returnStop)).toBe(false);
  });

  it('detects active stop and next pending stop', () => {
    const stops: JourneyStop[] = [
      { id: 's-1', journeyId: 'j-1', clientId: 'c-1', position: 1, status: 'completed', isReturnToBase: false },
      { id: 's-2', journeyId: 'j-1', clientId: 'c-2', position: 2, status: 'traveling', isReturnToBase: false },
      { id: 's-3', journeyId: 'j-1', clientId: 'c-3', position: 3, status: 'pending', isReturnToBase: false }
    ];

    const active = getActiveStop(stops);
    expect(active?.id).toBe('s-2');

    const nextPending = getNextPendingStop(stops);
    expect(nextPending?.id).toBe('s-3');
  });
});
