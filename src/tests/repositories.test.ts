import { describe, it, expect, beforeEach } from 'vitest';
import { db, seedInitialDataIfEmpty } from '../db/database';
import { clientRepository } from '../db/repositories/clientRepository';
import { journeyRepository } from '../db/repositories/journeyRepository';
import { backupRepository } from '../db/repositories/backupRepository';

describe('repositories integration (IndexedDB)', () => {
  beforeEach(async () => {
    await db.clients.clear();
    await db.journeys.clear();
    await db.stops.clear();
    await db.events.clear();
  });

  it('seeds data and performs client CRUD', async () => {
    await seedInitialDataIfEmpty();
    const clients = await clientRepository.getAll();
    expect(clients.length).toBe(4);

    // Create client
    const newClient = await clientRepository.create({
      name: 'Farmácia Central Teste',
      address: 'Rua das Flores, 100',
      phone: '(11) 9999-8888',
      defaultServiceMinutes: 25
    });
    expect(newClient.name).toBe('Farmácia Central Teste');
    expect(newClient.defaultServiceMinutes).toBe(25);

    // Search client
    const searchResults = await clientRepository.search('Farmácia');
    expect(searchResults.length).toBe(1);
    expect(searchResults[0].id).toBe(newClient.id);

    // Update client
    await clientRepository.update(newClient.id, { notes: 'Anotação teste' });
    const updated = await clientRepository.getById(newClient.id);
    expect(updated?.notes).toBe('Anotação teste');

    // Archive client
    await clientRepository.archive(newClient.id);
    const activeClients = await clientRepository.getAll(false);
    expect(activeClients.find(c => c.id === newClient.id)).toBeUndefined();
    const allClients = await clientRepository.getAll(true);
    expect(allClients.find(c => c.id === newClient.id)).toBeDefined();
  });

  it('runs complete journey flow with stops and state transitions', async () => {
    const c1 = await clientRepository.create({ name: 'Cliente 1', address: 'End 1' });
    const c2 = await clientRepository.create({ name: 'Cliente 2', address: 'End 2' });

    // 1. Create planning
    const journeyId = await journeyRepository.createDailyPlanning([
      { clientId: c1.id, plannedServiceMinutes: 30 },
      { clientId: c2.id, plannedServiceMinutes: 45 }
    ]);
    expect(journeyId).toBeDefined();

    let journey = await journeyRepository.getEnrichedById(journeyId);
    expect(journey?.status).toBe('not_started');
    expect(journey?.stops.length).toBe(3); // 2 clients + 1 returnToBase

    // 2. Start Journey
    await journeyRepository.startJourney(journeyId);
    journey = await journeyRepository.getEnrichedById(journeyId);
    expect(journey?.status).toBe('in_progress');
    expect(journey?.startedAt).toBeDefined();

    // 3. Travel to stop 1
    const stop1 = journey!.stops[0];
    await journeyRepository.startTravel(journeyId, stop1.id);
    journey = await journeyRepository.getEnrichedById(journeyId);
    expect(journey?.stops[0].status).toBe('traveling');
    expect(journey?.stops[0].travelStartedAt).toBeDefined();

    // 4. Arrive at stop 1
    await journeyRepository.arriveAtStop(journeyId, stop1.id);
    journey = await journeyRepository.getEnrichedById(journeyId);
    expect(journey?.stops[0].status).toBe('arrived');
    expect(journey?.stops[0].arrivedAt).toBeDefined();

    // 5. Start Service at stop 1
    await journeyRepository.startService(journeyId, stop1.id);
    journey = await journeyRepository.getEnrichedById(journeyId);
    expect(journey?.stops[0].status).toBe('servicing');
    expect(journey?.stops[0].serviceStartedAt).toBeDefined();

    // 6. End Service at stop 1
    await journeyRepository.endService(journeyId, stop1.id, 'Atendimento realizado com sucesso');
    journey = await journeyRepository.getEnrichedById(journeyId);
    expect(journey?.stops[0].status).toBe('completed');
    expect(journey?.stops[0].serviceEndedAt).toBeDefined();
    expect(journey?.stops[0].notes).toBe('Atendimento realizado com sucesso');

    // 7. Add emergency stop during journey
    const c3 = await clientRepository.create({ name: 'Cliente Emergência', address: 'End 3' });
    await journeyRepository.addEmergencyStop(journeyId, c3.id, 20);
    journey = await journeyRepository.getEnrichedById(journeyId);
    expect(journey?.stops.length).toBe(4); // stop1 (completed), stop2 (pending), emergency (pending), returnToBase (pending)

    // 8. Finish journey
    const returnStop = journey?.stops.find(s => s.isReturnToBase);
    await journeyRepository.startReturnTravel(journeyId, returnStop!.id);
    await journeyRepository.finishJourney(journeyId, returnStop!.id);

    journey = await journeyRepository.getEnrichedById(journeyId);
    expect(journey?.status).toBe('completed');
    expect(journey?.endedAt).toBeDefined();
  });

  it('exports and imports backup safely', async () => {
    const c1 = await clientRepository.create({ name: 'Cliente Backup', address: 'End Backup' });
    const backup = await backupRepository.exportData();

    expect(backup.appName).toBe('RotaPro');
    expect(backup.clients.length).toBe(1);
    expect(backup.clients[0].name).toBe('Cliente Backup');

    // Clear and restore
    await db.clients.clear();
    const countBefore = await db.clients.count();
    expect(countBefore).toBe(0);

    await backupRepository.importData(backup, 'replace');
    const countAfter = await db.clients.count();
    expect(countAfter).toBe(1);
    const restoredClient = await clientRepository.getById(c1.id);
    expect(restoredClient?.name).toBe('Cliente Backup');
  });
});
