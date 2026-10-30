import { db } from '../database';
import type { Journey, JourneyStop, JourneyEvent, EnrichedJourney, Client } from '../../types';
import { getNowIso, getTodayDateString } from '../../domain/time/timeService';
import { enrichJourney } from '../../domain/journey/journeyEngine';

export const journeyRepository = {
  async getTodayJourney(): Promise<EnrichedJourney | undefined> {
    const today = getTodayDateString();
    // Prioritize in_progress journeys, then not_started today
    const inProgress = await db.journeys.where('status').equals('in_progress').first();
    if (inProgress) {
      return this.getEnrichedById(inProgress.id);
    }

    const todayJourneys = await db.journeys.where('date').equals(today).toArray();
    if (todayJourneys.length > 0) {
      // Pick latest
      const latest = todayJourneys[todayJourneys.length - 1];
      return this.getEnrichedById(latest.id);
    }

    return undefined;
  },

  async getEnrichedById(id: string): Promise<EnrichedJourney | undefined> {
    const journey = await db.journeys.get(id);
    if (!journey) return undefined;

    const stops = await db.stops.where('journeyId').equals(id).toArray();
    const events = await db.events.where('journeyId').equals(id).toArray();

    // Fetch all clients referenced
    const clientIds = stops.map(s => s.clientId).filter(cid => cid !== 'return_to_base');
    const clients = await db.clients.where('id').anyOf(clientIds).toArray();
    const clientsMap = new Map<string, Client>(clients.map(c => [c.id, c]));

    return enrichJourney(journey, stops, events, clientsMap);
  },

  async getAllEnriched(): Promise<EnrichedJourney[]> {
    const journeys = await db.journeys.orderBy('date').reverse().toArray();
    const result: EnrichedJourney[] = [];
    for (const j of journeys) {
      const enriched = await this.getEnrichedById(j.id);
      if (enriched) result.push(enriched);
    }
    return result;
  },

  async createDailyPlanning(
    plannedItems: { clientId: string; plannedServiceMinutes?: number }[]
  ): Promise<string> {
    const now = getNowIso();
    const today = getTodayDateString();
    const journeyId = 'journey_' + Date.now();

    const journey: Journey = {
      id: journeyId,
      date: today,
      status: 'not_started',
      createdAt: now,
      updatedAt: now
    };

    const stops: JourneyStop[] = [];

    // Client stops
    plannedItems.forEach((item, index) => {
      stops.push({
        id: `stop_${journeyId}_${index + 1}`,
        journeyId,
        clientId: item.clientId,
        position: index + 1,
        status: 'pending',
        plannedServiceMinutes: item.plannedServiceMinutes || 30,
        isReturnToBase: false
      });
    });

    // Final Return to Base Stop
    stops.push({
      id: `stop_${journeyId}_return`,
      journeyId,
      clientId: 'return_to_base',
      position: stops.length + 1,
      status: 'pending',
      isReturnToBase: true
    });

    await db.transaction('rw', [db.journeys, db.stops, db.events], async () => {
      await db.journeys.add(journey);
      await db.stops.bulkAdd(stops);
      await db.events.add({
        id: 'event_' + Date.now(),
        journeyId,
        type: 'STOP_ADDED',
        occurredAt: now,
        metadata: { stopsCount: plannedItems.length }
      });
    });

    return journeyId;
  },

  async startJourney(journeyId: string): Promise<void> {
    const now = getNowIso();
    await db.transaction('rw', [db.journeys, db.events], async () => {
      await db.journeys.update(journeyId, {
        status: 'in_progress',
        startedAt: now,
        updatedAt: now
      });
      await db.events.add({
        id: 'event_' + Date.now(),
        journeyId,
        type: 'JOURNEY_START',
        occurredAt: now
      });
    });
  },

  async startTravel(journeyId: string, stopId: string): Promise<void> {
    const now = getNowIso();
    await db.transaction('rw', [db.stops, db.events], async () => {
      await db.stops.update(stopId, {
        status: 'traveling',
        travelStartedAt: now
      });
      await db.events.add({
        id: 'event_' + Date.now(),
        journeyId,
        stopId,
        type: 'TRAVEL_START',
        occurredAt: now
      });
    });
  },

  async arriveAtStop(journeyId: string, stopId: string): Promise<void> {
    const now = getNowIso();
    await db.transaction('rw', [db.stops, db.events], async () => {
      await db.stops.update(stopId, {
        status: 'arrived',
        arrivedAt: now
      });
      await db.events.add({
        id: 'event_' + Date.now(),
        journeyId,
        stopId,
        type: 'ARRIVE',
        occurredAt: now
      });
    });
  },

  async startService(journeyId: string, stopId: string): Promise<void> {
    const now = getNowIso();
    await db.transaction('rw', [db.stops, db.events], async () => {
      await db.stops.update(stopId, {
        status: 'servicing',
        serviceStartedAt: now
      });
      await db.events.add({
        id: 'event_' + Date.now(),
        journeyId,
        stopId,
        type: 'SERVICE_START',
        occurredAt: now
      });
    });
  },

  async endService(journeyId: string, stopId: string, notes?: string): Promise<void> {
    const now = getNowIso();
    await db.transaction('rw', [db.stops, db.events], async () => {
      await db.stops.update(stopId, {
        status: 'completed',
        serviceEndedAt: now,
        notes: notes?.trim() || undefined
      });
      await db.events.add({
        id: 'event_' + Date.now(),
        journeyId,
        stopId,
        type: 'SERVICE_END',
        occurredAt: now,
        metadata: { notes }
      });
    });
  },

  async skipStop(journeyId: string, stopId: string, reason?: string): Promise<void> {
    const now = getNowIso();
    await db.transaction('rw', [db.stops, db.events], async () => {
      await db.stops.update(stopId, {
        status: 'skipped',
        notes: reason || 'Visita pulada'
      });
      await db.events.add({
        id: 'event_' + Date.now(),
        journeyId,
        stopId,
        type: 'STOP_SKIPPED',
        occurredAt: now,
        metadata: { reason }
      });
    });
  },

  async cancelStop(journeyId: string, stopId: string, reason?: string): Promise<void> {
    const now = getNowIso();
    await db.transaction('rw', [db.stops, db.events], async () => {
      await db.stops.update(stopId, {
        status: 'cancelled',
        notes: reason || 'Visita cancelada'
      });
      await db.events.add({
        id: 'event_' + Date.now(),
        journeyId,
        stopId,
        type: 'STOP_CANCELLED',
        occurredAt: now,
        metadata: { reason }
      });
    });
  },

  async startReturnTravel(journeyId: string, returnStopId: string): Promise<void> {
    const now = getNowIso();
    await db.transaction('rw', [db.stops, db.events], async () => {
      await db.stops.update(returnStopId, {
        status: 'traveling',
        travelStartedAt: now
      });
      await db.events.add({
        id: 'event_' + Date.now(),
        journeyId,
        stopId: returnStopId,
        type: 'RETURN_START',
        occurredAt: now
      });
    });
  },

  async finishJourney(journeyId: string, returnStopId?: string): Promise<void> {
    const now = getNowIso();
    await db.transaction('rw', [db.journeys, db.stops, db.events], async () => {
      if (returnStopId) {
        await db.stops.update(returnStopId, {
          status: 'completed',
          travelEndedAt: now,
          arrivedAt: now
        });
        await db.events.add({
          id: 'event_' + Date.now() + '_ret',
          journeyId,
          stopId: returnStopId,
          type: 'RETURN_END',
          occurredAt: now
        });
      }

      await db.journeys.update(journeyId, {
        status: 'completed',
        endedAt: now,
        updatedAt: now
      });

      await db.events.add({
        id: 'event_' + Date.now(),
        journeyId,
        type: 'JOURNEY_END',
        occurredAt: now
      });
    });
  },

  async addEmergencyStop(
    journeyId: string, 
    clientId: string, 
    plannedMinutes = 30
  ): Promise<JourneyStop> {
    const now = getNowIso();
    const stops = await db.stops.where('journeyId').equals(journeyId).toArray();
    
    // Find return stop or last position
    const returnStop = stops.find(s => s.isReturnToBase);
    const returnPos = returnStop ? returnStop.position : stops.length + 1;

    // The new stop takes returnPos, and returnPos increments
    const newStop: JourneyStop = {
      id: `stop_${journeyId}_emg_${Date.now()}`,
      journeyId,
      clientId,
      position: returnPos,
      status: 'pending',
      plannedServiceMinutes: plannedMinutes,
      isReturnToBase: false
    };

    await db.transaction('rw', [db.stops, db.events], async () => {
      if (returnStop) {
        await db.stops.update(returnStop.id, { position: returnPos + 1 });
      }
      await db.stops.add(newStop);
      await db.events.add({
        id: 'event_' + Date.now(),
        journeyId,
        stopId: newStop.id,
        type: 'STOP_ADDED',
        occurredAt: now,
        metadata: { emergency: true }
      });
    });

    return newStop;
  },

  async reorderPendingStops(journeyId: string, pendingStopIdsInOrder: string[]): Promise<void> {
    const allStops = await db.stops.where('journeyId').equals(journeyId).toArray();
    const nonPending = allStops
      .filter(s => s.status !== 'pending' && !s.isReturnToBase)
      .sort((a, b) => a.position - b.position);

    let nextPos = nonPending.length + 1;

    await db.transaction('rw', [db.stops, db.events], async () => {
      for (const id of pendingStopIdsInOrder) {
        await db.stops.update(id, { position: nextPos });
        nextPos++;
      }

      // Keep returnToBase at the end
      const returnStop = allStops.find(s => s.isReturnToBase);
      if (returnStop) {
        await db.stops.update(returnStop.id, { position: nextPos });
      }

      await db.events.add({
        id: 'event_' + Date.now(),
        journeyId,
        type: 'STOP_REORDERED',
        occurredAt: getNowIso(),
        metadata: { order: pendingStopIdsInOrder }
      });
    });
  },

  async removePendingStop(journeyId: string, stopId: string): Promise<void> {
    const stop = await db.stops.get(stopId);
    if (!stop || stop.status !== 'pending') return;

    await db.transaction('rw', [db.stops, db.events], async () => {
      await db.stops.delete(stopId);
      await db.events.add({
        id: 'event_' + Date.now(),
        journeyId,
        stopId,
        type: 'STOP_CANCELLED',
        occurredAt: getNowIso(),
        metadata: { action: 'removed_from_planning' }
      });
    });
  }
};
