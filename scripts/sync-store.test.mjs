import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { SyncStore } from './sync-store.mjs';

const client = name => ({ id: '1', name, address: 'Rua A' });
async function fixture(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'rotapro-sync-'));
  t.after(() => {
    assert(path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(directory).startsWith('rotapro-sync-'));
    return rm(directory, { recursive: true, force: true });
  });
  const store = new SyncStore(directory);
  await store.init();
  return { directory, store };
}
test('paired key and data survive server restart', async t => {
  const { store, directory } = await fixture(t);
  assert.equal(store.authorized('bad'), false);
  assert.equal(store.authorized(store.key), true);
  await store.exchange([{ key: 'client/1', baseRevision: 0, value: client('A') }]);
  const restarted = new SyncStore(directory); await restarted.init();
  assert.equal(restarted.key, store.key);
  assert.equal((await restarted.exchange([])).records['client/1'].value.name, 'A');
});
test('concurrent edits preserve server and return a conflict', async t => {
  const { store } = await fixture(t);
  const results = await Promise.all(['A', 'B'].map(name => store.exchange([{ key: 'client/1', baseRevision: 0, value: client(name) }])));
  assert.deepEqual(results[1].conflicts, ['client/1']);
  assert.equal(results[1].records['client/1'].value.name, 'A');
});
test('lost-response retry is idempotent and independent documents merge', async t => {
  const { store } = await fixture(t);
  const change = { key: 'client/1', baseRevision: 0, value: client('A') };
  await store.exchange([change]);
  const retry = await store.exchange([change, { key: 'client/2', baseRevision: 0, value: { ...client('B'), id: '2' } }]);
  assert.deepEqual(retry.conflicts, []);
  assert.equal(retry.records['client/1'].revision, 1);
  assert.equal(retry.records['client/2'].value.name, 'B');
});
test('tombstone prevents stale devices from resurrecting deleted records', async t => {
  const { store } = await fixture(t);
  await store.exchange([{ key: 'client/1', baseRevision: 0, value: client('A') }]);
  await store.exchange([{ key: 'client/1', baseRevision: 1, value: null }]);
  const stale = await store.exchange([{ key: 'client/1', baseRevision: 1, value: client('Old') }]);
  assert.deepEqual(stale.conflicts, ['client/1']);
  assert.equal(stale.records['client/1'].value, null);
});
test('invalid batches cannot partly change data and journey children must match', async t => {
  const { store } = await fixture(t);
  await assert.rejects(store.exchange([
    { key: 'client/1', baseRevision: 0, value: client('A') },
    { key: 'journey/j1', baseRevision: 0, value: { journey: { id: 'j1', date: '2026-10-29' }, stops: [{ id: 's1', journeyId: 'other', clientId: '1' }], events: [] } },
  ]));
  assert.deepEqual((await store.exchange([])).records, {});
});
test('a journey is exchanged as one coherent document', async t => {
  const { store } = await fixture(t);
  const value = { journey: { id: 'j1', date: '2026-10-29', status: 'in_progress' }, stops: [{ id: 's1', journeyId: 'j1', clientId: '1', status: 'traveling' }], events: [{ id: 'e1', journeyId: 'j1', type: 'TRAVEL_START' }] };
  await store.exchange([{ key: 'journey/j1', value, baseRevision: 0 }]);
  const conflict = await store.exchange([{ key: 'journey/j1', value: { ...value, stops: [] }, baseRevision: 0 }]);
  assert.deepEqual(conflict.conflicts, ['journey/j1']);
  assert.equal(conflict.records['journey/j1'].value.stops.length, 1);
});
