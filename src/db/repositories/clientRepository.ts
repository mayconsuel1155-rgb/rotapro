import { db } from '../database';
import type { Client } from '../../types';
import { getNowIso } from '../../domain/time/timeService';

export const clientRepository = {
  async getAll(includeArchived = false): Promise<Client[]> {
    const all = await db.clients.toArray();
    if (includeArchived) return all;
    return all.filter(c => !c.archivedAt);
  },

  async getById(id: string): Promise<Client | undefined> {
    return db.clients.get(id);
  },

  async search(query: string, includeArchived = false): Promise<Client[]> {
    const q = query.trim().toLowerCase();
    const all = await this.getAll(includeArchived);
    if (!q) return all;
    return all.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.address.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q))
    );
  },

  async create(data: {
    name: string;
    address: string;
    phone?: string;
    notes?: string;
    defaultServiceMinutes?: number;
  }): Promise<Client> {
    const now = getNowIso();
    const newClient: Client = {
      id: 'client_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: data.name.trim(),
      address: data.address.trim(),
      phone: data.phone?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
      defaultServiceMinutes: Number(data.defaultServiceMinutes) || 30,
      createdAt: now,
      updatedAt: now
    };

    await db.clients.add(newClient);
    return newClient;
  },

  async update(id: string, data: Partial<Client>): Promise<void> {
    await db.clients.update(id, {
      ...data,
      updatedAt: getNowIso()
    });
  },

  async archive(id: string): Promise<void> {
    await db.clients.update(id, {
      archivedAt: getNowIso(),
      updatedAt: getNowIso()
    });
  },

  async unarchive(id: string): Promise<void> {
    await db.clients.update(id, {
      archivedAt: null,
      updatedAt: getNowIso()
    });
  },

  async delete(id: string): Promise<boolean> {
    // Check if client is used in any journey stops
    const usedCount = await db.stops.where('clientId').equals(id).count();
    if (usedCount > 0) {
      // If used, soft delete (archive) instead to preserve integrity
      await this.archive(id);
      return false; // indicates it was archived instead of physically deleted
    }
    await db.clients.delete(id);
    return true;
  },

  async getVisitHistory(clientId: string) {
    const stops = await db.stops.where('clientId').equals(clientId).toArray();
    const completedStops = stops.filter(s => s.status === 'completed');
    
    // Sort descending by date
    return completedStops.sort((a, b) => {
      const timeA = new Date(a.serviceEndedAt || a.travelStartedAt || 0).getTime();
      const timeB = new Date(b.serviceEndedAt || b.travelStartedAt || 0).getTime();
      return timeB - timeA;
    });
  }
};
