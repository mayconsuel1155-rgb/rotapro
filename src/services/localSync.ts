import { db } from '../db/database';
import type { Client, Journey, JourneyStop, JourneyEvent } from '../types';

type JourneyDocument = { journey: Journey; stops: JourneyStop[]; events: JourneyEvent[] };
type Document = Client | JourneyDocument | null;
type Entry = { revision: number; value: Document };
type Records = Record<string, Entry>;
export type SyncConflict = { key: string; remote: Entry; local: Document };
export type SyncStatus = { message: string; busy: boolean; conflicts: SyncConflict[]; lastSync?: string };
let status: SyncStatus = { message: 'Informe o código do computador para sincronizar.', busy: false, conflicts: [] };
export const getSyncStatus = () => status;
const listeners = new Set<() => void>();
export const subscribeSync = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
function publish(patch: Partial<SyncStatus>) { status = { ...status, ...patch }; listeners.forEach(fn => fn()); }
const tables = () => [db.clients, db.journeys, db.stops, db.events, db.syncState];
export function serialized(value: unknown): string {
  return JSON.stringify(value, (_key, v) => v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
}
async function capture(): Promise<Record<string, Document>> {
  const [clients, journeys, stops, events] = await Promise.all([db.clients.toArray(), db.journeys.toArray(), db.stops.toArray(), db.events.toArray()]);
  const docs: Record<string, Document> = {};
  clients.forEach(c => { docs['client/' + c.id] = c; });
  journeys.forEach(j => { docs['journey/' + j.id] = {
    journey: j,
    stops: stops.filter(s => s.journeyId === j.id).sort((a, b) => a.id.localeCompare(b.id)),
    events: events.filter(e => e.journeyId === j.id).sort((a, b) => a.id.localeCompare(b.id)),
  }; });
  return docs;
}
async function applyDocument(key: string, value: Document) {
  const id = key.slice(key.indexOf('/') + 1);
  if (key.startsWith('client/')) {
    if (value === null) await db.clients.delete(id);
    else await db.clients.put(value as Client);
  } else {
    await db.stops.where('journeyId').equals(id).delete();
    await db.events.where('journeyId').equals(id).delete();
    if (value === null) await db.journeys.delete(id);
    else {
      const doc = value as JourneyDocument;
      await db.journeys.put(doc.journey);
      await db.stops.bulkPut(doc.stops);
      await db.events.bulkPut(doc.events);
    }
  }
}
const isEditing = () => !!document.activeElement?.matches('input, textarea, select, [contenteditable="true"]');
export async function syncNow() {
  if (status.busy || isEditing() || !import.meta.env.PROD) return;
  const pairingKey = localStorage.getItem('rotapro-pairing-key');
  if (!pairingKey) return;
  publish({ busy: true, message: 'Sincronizando com o computador…' });
  try {
    const { sent, baseline } = await db.transaction('r', tables(), async () => ({
      sent: await capture(), baseline: (await db.syncState.get('baseline'))?.value as Records || {},
    }));
    const changes = [...new Set([...Object.keys(sent), ...Object.keys(baseline)])]
      .filter(key => serialized(sent[key] ?? null) !== serialized(baseline[key]?.value ?? null))
      .map(key => ({ key, value: sent[key] ?? null, baseRevision: baseline[key]?.revision || 0 }));
    const response = await fetch('/api/sync', {
      method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json', 'X-Pairing-Key': pairingKey },
      body: JSON.stringify({ changes }), signal: AbortSignal.timeout(10000),
    });
    if (response.status === 401) throw new Error('Código de pareamento inválido. Confira o terminal do computador.');
    if (!response.ok) throw new Error('Servidor indisponível. Seus dados continuam salvos neste aparelho.');
    const result = await response.json() as { records: Records; conflicts: string[] };
    if (!result.records || !Array.isArray(result.conflicts)) throw new Error('Resposta inválida do servidor.');
    let applied = false;
    const conflicts: SyncConflict[] = [];
    await db.transaction('rw', tables(), async () => {
      const current = await capture();
      for (const [key, entry] of Object.entries(result.records)) {
        if (result.conflicts.includes(key)) {
          conflicts.push({ key, remote: entry, local: current[key] ?? null });
          continue;
        }
        // Changes made while the request was in flight remain local for the next sync.
        if (!isEditing() && serialized(current[key] ?? null) === serialized(sent[key] ?? null)) {
          if (serialized(current[key] ?? null) !== serialized(entry.value)) {
            await applyDocument(key, entry.value);
            applied = true;
          }
          baseline[key] = entry;
        } else if (changes.some(c => c.key === key)) {
          // Server accepted our snapshot; later local edits must use its new revision.
          baseline[key] = entry;
        }
      }
      await db.syncState.put({ id: 'baseline', value: baseline });
    });
    if (applied) window.dispatchEvent(new Event('rotapro-data-synced'));
    const lastSync = new Date().toISOString();
    localStorage.setItem('rotapro-last-sync', lastSync);
    publish({ lastSync, conflicts, message: conflicts.length ? 'Há alterações nos dois aparelhos. Escolha qual versão manter.' : 'Dados sincronizados com o computador.' });
  } catch (error) {
    publish({ message: error instanceof TypeError || (error instanceof DOMException && error.name === 'TimeoutError')
      ? 'Computador não encontrado. Alterações salvas neste aparelho; nova tentativa automática.'
      : error instanceof Error ? error.message : 'Não foi possível sincronizar.' });
  } finally { publish({ busy: false }); }
}
export async function resolveConflict(conflict: SyncConflict, source: 'local' | 'remote') {
  if (status.busy) return;
  await db.transaction('rw', tables(), async () => {
    const baseline = (await db.syncState.get('baseline'))?.value as Records || {};
    if (source === 'remote') await applyDocument(conflict.key, conflict.remote.value);
    baseline[conflict.key] = conflict.remote;
    await db.syncState.put({ id: 'baseline', value: baseline });
  });
  publish({ conflicts: status.conflicts.filter(c => c.key !== conflict.key) });
  if (source === 'remote') window.dispatchEvent(new Event('rotapro-data-synced'));
  await syncNow();
}
export function startLocalSync() {
  if (!import.meta.env.PROD) return () => {};
  publish({ lastSync: localStorage.getItem('rotapro-last-sync') || undefined });
  const check = () => { if (document.visibilityState === 'visible') void syncNow(); };
  window.addEventListener('online', check);
  window.addEventListener('focus', check);
  document.addEventListener('visibilitychange', check);
  const timer = window.setInterval(check, 30000);
  check();
  return () => {
    clearInterval(timer); window.removeEventListener('online', check); window.removeEventListener('focus', check);
    document.removeEventListener('visibilitychange', check);
  };
}
