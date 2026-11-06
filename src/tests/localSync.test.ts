import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { db } from '../db/database';
import { syncNow, getSyncStatus, resolveConflict } from '../services/localSync';

const client = (name: string) => ({ id: 'c1', name, address: 'Rua A', createdAt: '2026-10-29T10:00:00Z', updatedAt: '2026-10-29T10:00:00Z' });
beforeEach(async () => {
  vi.stubEnv('PROD', true);
  await db.transaction('rw', db.tables, () => Promise.all(db.tables.map(table => table.clear())));
  localStorage.clear(); localStorage.setItem('rotapro-pairing-key', 'paired');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('local sync', () => {
  it('keeps offline edits and sends them when the server returns', async () => {
    await db.clients.put(client('Offline'));
    const fetch = vi.fn().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(new Response(JSON.stringify({ records: { 'client/c1': { revision: 1, value: client('Offline') } }, conflicts: [] })));
    vi.stubGlobal('fetch', fetch);
    await syncNow();
    expect((await db.clients.get('c1'))?.name).toBe('Offline');
    expect(await db.syncState.get('baseline')).toBeUndefined();
    await syncNow();
    expect(JSON.parse(fetch.mock.calls[1][1].body).changes[0].value.name).toBe('Offline');
  });
  it('never overwrites an edit made during the request', async () => {
    await db.clients.put(client('Sent'));
    vi.stubGlobal('fetch', vi.fn(async () => {
      await db.clients.put(client('Edited while waiting'));
      return new Response(JSON.stringify({ records: { 'client/c1': { revision: 1, value: client('Sent') } }, conflicts: [] }));
    }));
    await syncNow();
    expect((await db.clients.get('c1'))?.name).toBe('Edited while waiting');
    expect((await db.syncState.get('baseline'))?.value).toEqual({ 'client/c1': { revision: 1, value: client('Sent') } });
  });
  it('retains conflicting local data until user chooses the remote version', async () => {
    await db.clients.put(client('Phone'));
    const remote = { revision: 2, value: client('Computer') };
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ records: { 'client/c1': remote }, conflicts: ['client/c1'] }))).mockResolvedValueOnce(new Response(JSON.stringify({ records: { 'client/c1': remote }, conflicts: [] })));
    vi.stubGlobal('fetch', fetch);
    await syncNow();
    expect((await db.clients.get('c1'))?.name).toBe('Phone');
    await resolveConflict(getSyncStatus().conflicts[0], 'remote');
    expect((await db.clients.get('c1'))?.name).toBe('Computer');
    expect(getSyncStatus().conflicts).toHaveLength(0);
  });
  it('sends deletions as tombstones and imports new records', async () => {
    await db.syncState.put({ id: 'baseline', value: { 'client/c1': { revision: 1, value: client('Deleted locally') } } });
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ records: { 'client/c1': { revision: 2, value: null }, 'client/c2': { revision: 1, value: { ...client('Remote'), id: 'c2' } } }, conflicts: [] })));
    vi.stubGlobal('fetch', fetch);
    await syncNow();
    expect(JSON.parse(fetch.mock.calls[0][1].body).changes).toEqual([{ key: 'client/c1', value: null, baseRevision: 1 }]);
    expect(await db.clients.get('c1')).toBeUndefined();
    expect((await db.clients.get('c2'))?.name).toBe('Remote');
  });
});
