import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes, timingSafeEqual } from 'node:crypto';

export function validDocument(key, value) {
  if (typeof key !== 'string' || !/^(client|journey)\/.{1,200}$/.test(key)) return false;
  if (value === null) return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const id = key.slice(key.indexOf('/') + 1);
  if (key.startsWith('client/')) return value.id === id && typeof value.name === 'string' && typeof value.address === 'string';
  return value.journey?.id === id && typeof value.journey.date === 'string' &&
    Array.isArray(value.stops) && Array.isArray(value.events) &&
    value.stops.every(s => typeof s.id === 'string' && s.journeyId === id && typeof s.clientId === 'string') &&
    value.events.every(e => typeof e.id === 'string' && e.journeyId === id);
}

export class SyncStore {
  constructor(directory) {
    this.directory = directory;
    this.queue = Promise.resolve();
  }
  async init() {
    await mkdir(this.directory, { recursive: true });
    const file = path.join(this.directory, 'pairing-key');
    try { this.key = (await readFile(file, 'utf8')).trim(); }
    catch (e) {
      if (e.code !== 'ENOENT') throw e;
      this.key = randomBytes(24).toString('hex');
      await writeFile(file, this.key, { mode: 0o600 });
    }
    try { this.records = JSON.parse(await readFile(path.join(this.directory, 'sync.json'), 'utf8')); }
    catch (e) { if (e.code !== 'ENOENT') throw e; this.records = {}; }
  }
  authorized(key) {
    const actual = Buffer.from(key || '');
    const expected = Buffer.from(this.key);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
  exchange(changes) {
    const operation = this.queue.then(() => this.commit(changes));
    this.queue = operation.catch(() => {});
    return operation;
  }
  async commit(changes) {
    if (!Array.isArray(changes) || changes.length > 10000) throw new Error('Invalid changes');
    const keys = new Set();
    for (const c of changes) {
      if (!c || !validDocument(c.key, c.value) || !Number.isSafeInteger(c.baseRevision) || c.baseRevision < 0 || keys.has(c.key)) throw new Error('Invalid document');
      keys.add(c.key);
    }
    const records = { ...this.records };
    const conflicts = [];
    for (const c of changes) {
      const current = records[c.key];
      // A retry after a lost response is safe and must not create a conflict.
      if (current && JSON.stringify(current.value) === JSON.stringify(c.value)) continue;
      if ((current?.revision || 0) !== c.baseRevision) { conflicts.push(c.key); continue; }
      records[c.key] = { revision: (current?.revision || 0) + 1, value: c.value };
    }
    const target = path.join(this.directory, 'sync.json');
    if (JSON.stringify(records) !== JSON.stringify(this.records)) {
      // Preserve the preceding state before atomically publishing the next one.
      await writeFile(path.join(this.directory, 'sync.previous.json'), JSON.stringify(this.records));
      await writeFile(target + '.tmp', JSON.stringify(records), { mode: 0o600 });
      await rename(target + '.tmp', target);
      this.records = records;
    }
    return { records: this.records, conflicts };
  }
}
