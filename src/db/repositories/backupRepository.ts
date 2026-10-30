import { db } from '../database';
import type { BackupData, Client, Journey, JourneyStop, JourneyEvent } from '../../types';
import { getNowIso } from '../../domain/time/timeService';

export const backupRepository = {
  async exportData(): Promise<BackupData> {
    const clients = await db.clients.toArray();
    const journeys = await db.journeys.toArray();
    const stops = await db.stops.toArray();
    const events = await db.events.toArray();

    return {
      appName: 'RotaPro',
      version: '1.0',
      exportedAt: getNowIso(),
      clients,
      journeys,
      stops,
      events
    };
  },

  downloadBackupFile(backup: BackupData): void {
    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    // File name format: rotapro_backup_YYYY-MM-DD_HHmm.json
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `rotapro_backup_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  validateBackupFile(data: any): data is BackupData {
    if (!data || typeof data !== 'object') return false;
    if (data.appName !== 'RotaPro') return false;
    if (!Array.isArray(data.clients) || !Array.isArray(data.journeys) || !Array.isArray(data.stops)) {
      return false;
    }
    return true;
  },

  async importData(backup: BackupData, mode: 'replace' | 'merge' = 'replace'): Promise<{
    clientsCount: number;
    journeysCount: number;
    stopsCount: number;
  }> {
    if (!this.validateBackupFile(backup)) {
      throw new Error('Arquivo de backup inválido ou incompatível com o RotaPro.');
    }

    return await db.transaction('rw', [db.clients, db.journeys, db.stops, db.events], async () => {
      if (mode === 'replace') {
        await db.clients.clear();
        await db.journeys.clear();
        await db.stops.clear();
        await db.events.clear();
      }

      // Add clients
      if (backup.clients.length > 0) {
        if (mode === 'replace') {
          await db.clients.bulkAdd(backup.clients);
        } else {
          await db.clients.bulkPut(backup.clients);
        }
      }

      // Add journeys
      if (backup.journeys.length > 0) {
        if (mode === 'replace') {
          await db.journeys.bulkAdd(backup.journeys);
        } else {
          await db.journeys.bulkPut(backup.journeys);
        }
      }

      // Add stops
      if (backup.stops.length > 0) {
        if (mode === 'replace') {
          await db.stops.bulkAdd(backup.stops);
        } else {
          await db.stops.bulkPut(backup.stops);
        }
      }

      // Add events
      if (backup.events && backup.events.length > 0) {
        if (mode === 'replace') {
          await db.events.bulkAdd(backup.events);
        } else {
          await db.events.bulkPut(backup.events);
        }
      }

      return {
        clientsCount: backup.clients.length,
        journeysCount: backup.journeys.length,
        stopsCount: backup.stops.length
      };
    });
  },

  async clearAllData(): Promise<void> {
    await db.transaction('rw', [db.clients, db.journeys, db.stops, db.events], async () => {
      await db.clients.clear();
      await db.journeys.clear();
      await db.stops.clear();
      await db.events.clear();
    });
  }
};
