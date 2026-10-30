import type { Journey, JourneyStop, JourneyStats, EnrichedJourney, Client, JourneyEvent } from '../../types';
import { calculateDurationSeconds } from '../time/timeService';

export function calculateJourneyStats(
  journey: Journey,
  stops: JourneyStop[]
): JourneyStats {
  const clientStops = stops.filter(s => !s.isReturnToBase);
  const completedStops = clientStops.filter(s => s.status === 'completed').length;
  const skippedStops = clientStops.filter(s => s.status === 'skipped').length;
  const cancelledStops = clientStops.filter(s => s.status === 'cancelled').length;

  let totalTravelSeconds = 0;
  let totalServiceSeconds = 0;

  for (const stop of stops) {
    if (stop.travelStartedAt) {
      const travelEnd = stop.arrivedAt || stop.travelEndedAt;
      totalTravelSeconds += calculateDurationSeconds(stop.travelStartedAt, travelEnd);
    }
    if (stop.serviceStartedAt) {
      totalServiceSeconds += calculateDurationSeconds(stop.serviceStartedAt, stop.serviceEndedAt);
    }
  }

  const totalDurationSeconds = journey.startedAt
    ? calculateDurationSeconds(journey.startedAt, journey.endedAt)
    : 0;

  return {
    totalStops: clientStops.length,
    completedStops,
    skippedStops,
    cancelledStops,
    totalTravelSeconds,
    totalServiceSeconds,
    totalDurationSeconds
  };
}

export function enrichJourney(
  journey: Journey,
  stops: JourneyStop[],
  events: JourneyEvent[],
  clientsMap: Map<string, Client>
): EnrichedJourney {
  const enrichedStops = stops
    .sort((a, b) => a.position - b.position)
    .map(stop => ({
      ...stop,
      client: clientsMap.get(stop.clientId)
    }));

  const stats = calculateJourneyStats(journey, stops);

  return {
    ...journey,
    stops: enrichedStops,
    events: events.sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()),
    stats
  };
}

/**
 * Validates whether a stop reorder is allowed.
 * Only stops with status 'pending' can be reordered!
 */
export function canReorderStop(stop: JourneyStop): boolean {
  return stop.status === 'pending' && !stop.isReturnToBase;
}

/**
 * Finds the currently active stop in a journey, if any.
 */
export function getActiveStop(stops: JourneyStop[]): JourneyStop | undefined {
  return stops.find(s => ['traveling', 'arrived', 'servicing'].includes(s.status));
}

/**
 * Finds the next pending stop in order.
 */
export function getNextPendingStop(stops: JourneyStop[]): JourneyStop | undefined {
  return stops
    .slice()
    .sort((a, b) => a.position - b.position)
    .find(s => s.status === 'pending');
}
