import Dexie, { type Table } from 'dexie';
import type { Client, Journey, JourneyStop, JourneyEvent } from '../types';

export class RotaProDatabase extends Dexie {
  clients!: Table<Client, string>;
  journeys!: Table<Journey, string>;
  stops!: Table<JourneyStop, string>;
  events!: Table<JourneyEvent, string>;

  constructor() {
    super('RotaProDB');

    this.version(1).stores({
      clients: 'id, name, address, createdAt, archivedAt',
      journeys: 'id, date, status, startedAt, endedAt, createdAt',
      stops: 'id, journeyId, clientId, position, status',
      events: 'id, journeyId, stopId, type, occurredAt'
    });
  }
}

export const db = new RotaProDatabase();

/**
 * Seed initial sample clients if DB is brand new
 */
export async function seedInitialDataIfEmpty(): Promise<void> {
  const count = await db.clients.count();
  if (count === 0) {
    const now = new Date().toISOString();
    const initialClients: Client[] = [
      {
        id: 'client-1',
        name: 'Hospital São Lucas',
        address: 'Av. Paulista, 1200 - Bela Vista, São Paulo - SP',
        phone: '(11) 98765-4321',
        notes: 'Entrada de fornecedores pelo portão lateral B. Falar com Dra. Renata.',
        defaultServiceMinutes: 45,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'client-2',
        name: 'Clínica Saúde Total',
        address: 'Rua Domingos de Morais, 850 - Vila Mariana, São Paulo - SP',
        phone: '(11) 97654-3210',
        notes: 'Estacionamento com convênio no local.',
        defaultServiceMinutes: 30,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'client-3',
        name: 'Laboratório Central Diagnósticos',
        address: 'Rua Vergueiro, 2350 - Chácara Klabin, São Paulo - SP',
        phone: '(11) 96543-2109',
        notes: 'Horário preferencial entre 10h e 12h. Setor de compras.',
        defaultServiceMinutes: 35,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'client-4',
        name: 'Centro Médico Alvorada',
        address: 'Av. Ibirapuera, 310 - Moema, São Paulo - SP',
        phone: '(11) 95432-1098',
        notes: 'Recepção 3º andar. Assinatura com Dr. Carlos.',
        defaultServiceMinutes: 40,
        createdAt: now,
        updatedAt: now
      }
    ];

    await db.clients.bulkAdd(initialClients);
  }
}
